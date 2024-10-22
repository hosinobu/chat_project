import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_project.settings')
django.setup()

from .models import ChatRoom, ChatMessage, GoBoard
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
import asyncio
import logging
import html
import time
from django.urls import reverse


""" この行をコメントアウトすれば、ロガーリストが見れます
for logger_name in logging.root.manager.loggerDict:
    print(logger_name)
exit()
#"""

logger = logging.getLogger(__name__)
logging.getLogger("daphne.ws_protocol").setLevel(logging.ERROR)


GLOBAL_LOBBY, result = ChatRoom.objects.get_or_create(name='__system_lobby')
GLOBAL_LOBBY_ID = GLOBAL_LOBBY.id

class SendMethodMixin():

    #全てのメッセージは最終的にこの関数からクライアントに送られる
    async def send_message(self, event):
        logger.info(event['server_message_type'])
        #senderが設定されてなければ、自分自身からのメッセージ
        if not event.get('sender'):
            event['sender'] = self.user.account_id
        await self.send(text_data=json.dumps({
            **event
        }))

    #グループに送信
    async def send_message_to_group(self, server_message_type, **kwargs):
        logger.info(f"sending messege for group ->  {kwargs}")
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message',
                'server_message_type': server_message_type,
                'sender': self.user.account_id, #誰からのメッセージかを設定
                **kwargs
            }
        )

    #クライアントに返信(送信)
    async def send_message_to_client(self, server_message_type, **kwargs):
        logger.info(f"sending message ->  {kwargs}")
        await self.send_message({
            'server_message_type': server_message_type,
            **kwargs
        })


    # 過去のメッセージを取得してクライアントに送信
    async def send_previous_messages(self, room, message_limit = 50, time = None):
        previous_messages = await get_previous_messages(room, message_limit, time)

        for message in previous_messages:
            
            @database_sync_to_async
            def get_fields():
                img_url = ""
                thumbnail_url = ""
                if message.image:
                    img_url = message.image.image.url
                    if message.image.thumbnail:
                        thumbnail_url = message.image.thumbnail.url
                return (
                    message.user.account_id,
                    message.content,
                    str(message.timestamp),
                    img_url,
                    thumbnail_url
                )
            
            name, content, stamp ,img , thumbnail= await get_fields()

            logger.info(f"{name} {content} {stamp} {img} {thumbnail}")

            await self.send_message_to_client('chat',
                sender = name,
                content = content,
                timestamp = stamp,
                image_url = img,
                thumbnail_url = thumbnail,
            )


class LobbyConsumer(AsyncWebsocketConsumer,SendMethodMixin):

    users = set()
    serchsocket = {}

    async def connect(self):
        self.user = self.scope["user"]
        self.room_group_name = str(GLOBAL_LOBBY_ID)
        self.room_name = str(GLOBAL_LOBBY_ID)

        if self.user.is_authenticated:
            
            LobbyConsumer.users.add(self)
            LobbyConsumer.serchsocket[self.user.account_id] = self
            logger.info(f"{self.user.account_id}がロビーに接続しましたよ")


            result = await manage_user_in_chatroom(self,GLOBAL_LOBBY_ID,"add")

            user_list = [i.account_id for i in result]
                        
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            await self.send_message_to_client('your_account_id', account_id = self.user.account_id, is_server = True)
            self.last_active_time = time.time()
            self.check_timeout_task = asyncio.create_task(self.check_timeout())

            logger.info('befor_send_message_for_group')
            await self.send_message_to_group(
                'join',   
                name = self.user.account_id, #入室者名
                user_list = user_list #現在の入室者リスト
            )

            await self.send_previous_messages(GLOBAL_LOBBY, 50, 10) #最大５０件、１０分以内のメッセージを取得

        else:
            self.close()


    async def disconnect(self, close_code):
        
        # タイムアウトチェックタスクをキャンセル
        if hasattr(self, 'check_timeout_task'):
            self.check_timeout_task.cancel()
        
        result = await manage_user_in_chatroom(self,GLOBAL_LOBBY_ID, "remove")
        user_list = [i.account_id for i in result]
        
        if (close_code != 1000) & (close_code != 1001):
            logger.info(f"WebSocketが通常ではない切断が起きました-> CODE:{close_code}")

        await self.send_message_to_group('leave',
            name     = self.user.account_id, #退室者名
            user_list= user_list  #現在の入室者リスト
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        LobbyConsumer.users.remove(self)
        LobbyConsumer.serchsocket.pop(self.user.account_id, None)

    async def receive(self, text_data):

        self.last_active_time = time.time()

        text_data_json = json.loads(text_data)
        client_message_type = text_data_json['client_message_type']

        logger.info(f"lobby:{client_message_type}")

        match client_message_type:

            case 'get_lobby_id':

                logger.info(f"{client_message_type} -> {GLOBAL_LOBBY_ID}")
                await self.send_message_to_client(client_message_type, result = GLOBAL_LOBBY_ID)
                
            case 'chat':

                message = text_data_json['content']
                sanitized_message = html.escape(message)
                await save_message(GLOBAL_LOBBY, self.user, sanitized_message)
                text_data_json["name"] = self.user.account_id
                await self.send_message_to_group(client_message_type, **text_data_json)

            case 'make_room':

                room_name = text_data_json['room_name']
                @database_sync_to_async
                def make_room():
                    try:
                        new_chatroom = ChatRoom.objects.create(name = room_name)
                        new_chatroom.users.add(self.user)
                        chatroom = ChatRoom.objects.exclude(id = GLOBAL_LOBBY_ID)
                    except IntegrityError:
                        logger.info("部屋名がかぶってます")
                        return list()
                    return list(chatroom)
                room_list = { i.name : i.id for i in await make_room()}
                await self.send_message_to_client(client_message_type)
                await self.send_message_to_group(client_message_type, roomlist = room_list)
            
            case 'room-list-update':

                await self.room_list_update(client_message_type)


            case 'user-list-update':

                await user_list_update(self, GLOBAL_LOBBY_ID, client_message_type)

            case 'get-user-page':

                url = reverse("user_profile:user_top",
                        args = [text_data_json['userid']]
                    )
                await self.send_message_to_client(client_message_type,
                    url = url
                )

            case _:

                logger.info(f'unknown-message from client -> {client_message_type}')

    async def room_list_update(self, message_type):
        @database_sync_to_async
        def get_chat_room_all():
            try:
                chatroom = ChatRoom.objects.exclude(id = GLOBAL_LOBBY_ID)
                return list(chatroom)
            except ObjectDoesNotExist:
                logger.info(f"ChatRoom with id {GLOBAL_LOBBY_ID} does not exist")
                return []
        result = await get_chat_room_all()
        room_list = { i.name : i.id for i in result}
        await self.send_message_to_client(message_type, roomlist = room_list)
        
    async def check_timeout(self, wait_minute = 5, loop_wait = 20):
        waittime = loop_wait if loop_wait >= 1 else 1
        end_time = wait_minute * 60
        while time.time() < self.last_active_time + end_time:
            await asyncio.sleep(waittime)
        await self.send_message_to_client('timeout')
        await self.close()

class RoomConsumer(AsyncWebsocketConsumer, SendMethodMixin):

    users = set()
    serchsocket = {}
    delete_room_task = {}

    async def connect(self):


        self.user = self.scope["user"]
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = self.room_id
        self.room_name = self.room_id

        if self.user.is_authenticated:

            logger.info(f"{self.user}がROOM{self.room_id}に接続しました")


            RoomConsumer.users.add(self)
            RoomConsumer.serchsocket[self.user.account_id] = self

            #空部屋削除待ちタスクが走っていればキャンセル
            if RoomConsumer.delete_room_task.get(self.room_id):
                RoomConsumer.delete_room_task[self.room_id].cancel()
                del RoomConsumer.delete_room_task[self.room_id]

            result = await manage_user_in_chatroom(self, self.room_id,"add")
            user_list = [i.account_id for i in result]

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            await self.send_message_to_client('your_account_id', account_id = self.user.account_id)
            await self.send_message_to_group(
                'join',   
                name = self.user.account_id, #入室者名
                user_list = user_list #現在の入室者リスト
            )

            # 過去のメッセージを取得してクライアントに送信
            await self.send_previous_messages(self.room, 100)

        else:
            self.close()


    async def disconnect(self, close_code):
        print('DISCONNECT!!!!')
        if (close_code != 1000) & (close_code != 1001):
            logger.info(f"WebSocketが通常ではない切断が起きました-> CODE:{close_code}")

        result = await manage_user_in_chatroom(self, self.room_id,'remove')

        if len(result) == 0:

            RoomConsumer.delete_room_task[self.room_id] = asyncio.create_task(delete_room_after_timeout(self.room_id))

        else:

            user_list = [i.account_id for i in result]
            await self.send_message_to_group('leave',
                name     = self.user.account_id, #退室者名
                user_list= user_list  #現在の入室者リスト
            )
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        RoomConsumer.users.remove(self)
        RoomConsumer.serchsocket.pop(self.user.account_id, None)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)

        client_message_type = text_data_json['client_message_type']

        logger.info(f"roomconsumer: {client_message_type}")

        room_id = self.scope['url_route']['kwargs']['room_id']

        match client_message_type:

            case 'chat':

                message = text_data_json['content']
                sanitized_message = html.escape(message)
                await save_message(self.room, self.user, sanitized_message)
                text_data_json["name"] = self.user.account_id
                await self.send_message_to_group(client_message_type, **text_data_json)

            case 'user-list-update':
                await user_list_update(self, room_id, client_message_type)

            case 'get-user-page':
                url = reverse("user_profile:user_top",
                        args = [text_data_json['userid']]
                    )
                await self.send_message_to_client(client_message_type,
                    url = url
                )

            case 'make_go_board':

                y = text_data_json['y']
                x = text_data_json['x']

                @database_sync_to_async
                def make_go_board():
                    room = ChatRoom.objects.get(id = self.room_id)
                    new_board = GoBoard(y = y, x = x, room = room)#GoBoardクラスのForeignkeyにChatRoomがある。
                    new_board.save()
                    return {
                        "id" : new_board.id,
                        "y" : y,
                        "x" : x,
                    }
                
                board = await make_go_board()

                await self.send_message_to_group(client_message_type, **board)
            
            case 'place_stone':

                y = text_data_json['y']
                x = text_data_json['x']
                turn = text_data_json['turn']
                id = text_data_json['id']

                @database_sync_to_async
                def get_go_board():
                    board = GoBoard.objects.get(id = id)
                    if board.turn != turn:
                        return False,[] #同時に操作が来た可能性が高い
                    if board.place_stone(y, x, turn): #ここで盤面の変更とsave()が行われる。変更があればTrueが返ってくる
                        return True, {
                            "id": board.id,
                            "board":board.board,
                            "turn": board.turn, 
                            "koY": board.koY,
                            "koX": board.koX,
                            "koTurn": board.koTurn,
                            "black_capture": board.black_capture_count,
                            "white_capture": board.white_capture_count
                        }
                    return False,[]
                
                result, board = await get_go_board()

                if result:
                    await self.send_message_to_group(client_message_type, **board)
                    
            case 'p2pOffer' | 'p2pAnswer' | 'p2pIceCandidate':
                await self.p2psend_message(client_message_type, text_data_json)

    async def p2psend_message(self, message_type, text_data):
        logger.info(f"sendp2p_message {message_type}")
        target_socket = RoomConsumer.serchsocket.get(text_data['for'])
        if target_socket:
            text_data['server_message_type'] = message_type
            text_data['sender'] = self.user.account_id
            await target_socket.send_message(text_data)
        else:
            print(f"Error: Socket for account {text_data['for']} not found.")        
        

#######################################################################################

async def manage_user_in_chatroom(self, room_id, action):

    @database_sync_to_async
    def modify_user_in_chatroom():
        try:
            chatroom = ChatRoom.objects.get(id = room_id)
            if action == 'add':
                self.room = chatroom
                chatroom.users.add(self.user)
                logger.info(f"User {self.user} added to chatroom {room_id}")
            elif action == 'remove':
                chatroom.users.remove(self.user)
                logger.info(f"User {self.user} removed from chatroom {room_id}")
            return list(chatroom.users.all())
        except ChatRoom.DoesNotExist:
            logger.error(f"ChatRoom with id {room_id} does not exist")
            return []
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return []
    
    return await modify_user_in_chatroom()

async def delete_room_after_timeout(room_id, timeout=60):
    try:
        logger.info(f"Starting timeout for room {room_id} with timeout={timeout} seconds")
        await asyncio.sleep(timeout)
        logger.info(f"Timeout complete, checking room {room_id}")
        try:
            room = await database_sync_to_async(ChatRoom.objects.get)(id=room_id)
            user_count = await database_sync_to_async(room.users.count)()
            if user_count == 0:
                await database_sync_to_async(room.delete)()
                logger.info(f"Room {room_id} deleted.")

                if LobbyConsumer.users:
                    #部屋を削除したメッセージを任意のソケットを借りてブロードキャスト
                    await next(iter(LobbyConsumer.users)).send_message_to_group("make_room")
            else:
                logger.info(f"Room {room_id} still has users.")
        except ChatRoom.DoesNotExist:
            logger.info(f"Room {room_id} already deleted.")
        except Exception as e:
            logger.error(f"An error occurred: {e}")
        logger.info('delete_room_task finished.')
    except asyncio.CancelledError:
        logger.info('delete_room_task cancelled!')

async def user_list_update(socket, room_id, message_type):
    print("user_list_update() called.")
    @database_sync_to_async
    def get_user_list():
        try:
            chatroom = ChatRoom.objects.get(id = room_id)
            return list(chatroom.users.all())
        except ObjectDoesNotExist:
            logger.info(f"ChatRoom with id {room_id} does not exist")
            return []
    user_list_ids = [[user.account_id, user.id] for user in await get_user_list()]
    print(user_list_ids)
    await socket.send_message_to_client(
        message_type,
        userlist = user_list_ids
    )


@database_sync_to_async
def save_message(room, user, content):
    ChatMessage.objects.create(room=room, user=user, content=content)

@database_sync_to_async
def get_previous_messages(room, message_limit = 50, time = None):
    result = ChatMessage.objects.filter(room=room)
    if time:
        result = result.filter(timestamp__gte = timezone.now()-timedelta(minutes=time))
    return list(result.order_by('-timestamp')[:message_limit][::-1])