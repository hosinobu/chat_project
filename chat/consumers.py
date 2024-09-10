import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_project.settings')
django.setup()

from .models import ChatRoom, ChatMessage
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
import asyncio
import logging

logger = logging.getLogger(__name__)

lobby_room, created = ChatRoom.objects.get_or_create(name='__system_lobby')

GLOBAL_LOBBY_ID = lobby_room.id



class SendMethodMixin():

    #全てのメッセージは最終的にこの関数からクライアントに送られる
    async def send_message(self, event):
        server_message_type = event['server_message_type']
        await self.send(text_data=json.dumps({
            'server_message_type': server_message_type,
            **event
        }))

    #グループに送信
    async def send_message_to_group(self, server_message_type, **kwargs):
        logging.debug(f"sending messege for group ->  {kwargs}")
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message',
                'server_message_type': server_message_type,
                **kwargs
            }
        )

    #クライアントに返信(送信)
    async def send_message_to_client(self, server_message_type, **kwargs):
        logging.debug(f"sending message ->  {kwargs}")
        await self.send_message({
            'server_message_type': server_message_type,
            **kwargs
        })



class LobbyConsumer(AsyncWebsocketConsumer,SendMethodMixin):

    async def connect(self):
        self.user = self.scope["user"]
        self.room_group_name = 'chat_lobby'
        self.room_name = 'lobby'
        self.room_id = GLOBAL_LOBBY_ID

        if self.user.is_authenticated:
            
            logging.debug(f"{self.user}がロビーに接続しました")

            logging.debug(type(self.room_id))

            result = await manage_user_in_chatroom(self,"add")

            user_list = [i.account_id for i in result]
                        
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()

            logging.debug('befor_send_message_for_group')
            await self.send_message_to_group(
                'join',   
                name = self.user.account_id, #入室者名
                user_list = user_list #現在の入室者リスト
            )
        else:
            self.close()


    async def disconnect(self, close_code):
        
        result = await manage_user_in_chatroom(self, "remove")
        user_list = [i.account_id for i in result]
        
        if (close_code != 1000) & (close_code != 1001):
            logging.debug(f"WebSocketが通常ではない切断が起きました-> CODE:{close_code}")

        await self.send_message_to_group('leave',
            name     = self.user.account_id, #退室者名
            user_list= user_list  #現在の入室者リスト
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):

        text_data_json = json.loads(text_data)
        client_message_type = text_data_json['client_message_type']

        logging.debug(f"lobby:{client_message_type}")

        match client_message_type:

            case 'chat':
                text_data_json["name"] = self.user.account_id
                await self.send_message_to_group(client_message_type, **text_data_json)

            case 'make_room':
                room_name = text_data_json['room_name']
                @database_sync_to_async
                def make_room():
                    new_chatroom = ChatRoom.objects.create(name = room_name)
                    new_chatroom.users.add(self.user)
                    chatroom = ChatRoom.objects.exclude(id = GLOBAL_LOBBY_ID)
                    return list(chatroom)
                room_list = { i.name : i.id for i in await make_room()}
                await self.send_message_to_client(client_message_type)
                await self.send_message_to_group(client_message_type, **room_list)
            
            case 'room-list-update':

                @database_sync_to_async
                def get_chat_room_all():
                    try:
                        chatroom = ChatRoom.objects.exclude(id = GLOBAL_LOBBY_ID)
                        return list(chatroom)
                    except ObjectDoesNotExist:
                        logging.debug(f"ChatRoom with id {GLOBAL_LOBBY_ID} does not exist")
                        return []
                result = await get_chat_room_all()
                room_list = { i.name : i.id for i in result}
                await self.send_message_to_client(client_message_type, **room_list)

            case 'user-list-update':

                @database_sync_to_async
                def get_user_list():
                    try:
                        chatroom = ChatRoom.objects.get(id=GLOBAL_LOBBY_ID)
                        return list(chatroom.users.all())
                    except ObjectDoesNotExist:
                        logging.debug(f"ChatRoom with id {GLOBAL_LOBBY_ID} does not exist")
                        return []
                user_list_ids = [user.account_id for user in await get_user_list()]
                await self.send_message_to_client(
                    'user-list-update',
                    userlist = user_list_ids
                )

            case _:
                logging.debug(f'unknown-message from client -> {client_message_type}')



class RoomConsumer(AsyncWebsocketConsumer,SendMethodMixin):

    async def connect(self):

        self.user = self.scope["user"]
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = 'Room' + self.room_id
        self.room_name = self.room_id

        if self.user.is_authenticated:

            logging.debug(f"{self.user}がROOM{self.room_id}に接続しました")

            result = await manage_user_in_chatroom(self,"add")

            user_list = [i.account_id for i in result]

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            logging.debug('C')

            await self.send_message_to_group(
                'join',   
                name = self.user.account_id, #入室者名
                user_list = user_list #現在の入室者リスト
            )

            logging.debug('D')

            # 過去のメッセージを取得してクライアントに送信
            previous_messages = await get_previous_messages(self.room)
            logging.debug('DA')
            for message in previous_messages:
                
                @database_sync_to_async
                def get_fields():
                    return (
                        message.user.account_id,
                        message.content,
                        str(message.timestamp)
                    )
                
                name, content, stamp = await get_fields()

                logging.debug(f"{name} {content} {stamp}")

                await self.send_message_to_client('chat',
                    name = name,
                    content = content,
                    timestamp = stamp,
                )

        else:
            self.close()


    async def disconnect(self, close_code):
        if (close_code != 1000) & (close_code != 1001):
            logging.debug(f"WebSocketが通常ではない切断が起きました-> CODE:{close_code}")

        result = await manage_user_in_chatroom(self,'remove')

        if len(result) == 0:
            logger.info('befor_call_delete_room_after_timeout')
            asyncio.create_task(delete_room_after_timeout(self.room_id, timeout=60))
            logger.info("after_call_delete_room_after_timeout")

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

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)

        client_message_type = text_data_json['client_message_type']

        logging.debug(f"room:{client_message_type}")

        room_id = self.scope['url_route']['kwargs']['room_id']

        match client_message_type:

            case 'chat':

                message = text_data_json['content']
                await save_message(self.room, self.user, message)

                text_data_json["name"] = self.user.account_id
                await self.send_message_to_group(client_message_type, **text_data_json)

            case 'user-list-update':

                @database_sync_to_async
                def get_user_list():
                    try:
                        chatroom = ChatRoom.objects.get(id=room_id)
                        return list(chatroom.users.all())
                    except ObjectDoesNotExist:
                        logging.debug(f"ChatRoom with id {room_id} does not exist")
                        return []
                user_list_ids = [user.account_id for user in await get_user_list()]
                await self.send_message_to_client(
                    'user-list-update',
                    userlist = user_list_ids
                )
            case _:
                logging.debug(f'unknown-message from client -> {client_message_type}')

#######################################################################################

async def manage_user_in_chatroom(self, action):

    @database_sync_to_async
    def modify_user_in_chatroom():
        try:
            chatroom = ChatRoom.objects.get(id=self.room_id)
            if action == 'add':
                self.room = chatroom
                chatroom.users.add(self.user)
                logger.info(f"User {self.user} added to chatroom {self.room_id}")
            elif action == 'remove':
                chatroom.users.remove(self.user)
                logger.info(f"User {self.user} removed from chatroom {self.room_id}")
            return list(chatroom.users.all())
        except ChatRoom.DoesNotExist:
            logger.error(f"ChatRoom with id {self.room_id} does not exist")
            return []
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return []
    
    return await modify_user_in_chatroom()

async def delete_room_after_timeout(room_id, timeout=60):
    logger.info(f"Starting timeout for room {room_id} with timeout={timeout} seconds")
    await asyncio.sleep(timeout)
    logger.info(f"Timeout complete, checking room {room_id}")
    try:
        room = await database_sync_to_async(ChatRoom.objects.get)(id=room_id)
        user_count = await database_sync_to_async(room.users.count)()
        if user_count == 0:
            await database_sync_to_async(room.delete)()
            logger.info(f"Room {room_id} deleted.")
        else:
            logger.info(f"Room {room_id} still has users.")
    except ChatRoom.DoesNotExist:
        logger.info(f"Room {room_id} already deleted.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")


@database_sync_to_async
def save_message(room, user, content):
    ChatMessage.objects.create(room=room, user=user, content=content)

@database_sync_to_async
def get_previous_messages(room):
    return list(ChatMessage.objects.filter(room=room).order_by('timestamp'))
