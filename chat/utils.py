#utls.py
from channels.layers import get_channel_layer
from .forms import ChatMessageForm
from .models import ChatRoom
from channels.db import database_sync_to_async

async def handle_chat_message(request, roomid):

    form = ChatMessageForm(request.POST, request.FILES)
    
    if form.is_valid():
        # 非同期でチャットメッセージを保存
        @database_sync_to_async
        def save_message():
            chat_message = form.save(commit = False)
            chatroom = ChatRoom.objects.get(id=roomid)
            chat_message.room = chatroom
            chat_message.user = request.user
            chat_message.save()
            return chat_message.image.url, chat_message.content, chat_message.image

        url,content, image = await save_message()
        channel_layer = get_channel_layer()
        group_name = str(roomid)

        # チャットメッセージをグループに送信
        await channel_layer.group_send(
            group_name,
            {
                'type': 'send_message',
                'server_message_type' : 'chat',
                'image_url': url if image else None,
                'content' : content,
                'name': request.user.account_id,
            }
        )
        return {'success': True}
    return {'success': False, 'errors': form.errors}

async def user_ping_pong():
    pass