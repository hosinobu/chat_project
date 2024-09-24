#utls.py
from channels.layers import get_channel_layer
from .forms import ChatMessageForm
from .models import ChatRoom
from .models import ChatImage
from channels.db import database_sync_to_async

async def handle_chat_message(request, roomid):

    #フォームを取得 POST と　FILES を取得すれば、全部受け取れてるよ。
    form = ChatMessageForm(request.POST, request.FILES)
    #これでformは　forms.pyで宣言している ChatMessageForm型になってるよ
    #forms.pyのなかでmodelにchatMessageを指定しているから
    #仮に今form.save()すると、受け取った内容そのまんまで、chatMessageクラスのオブジェクトが生成されることになるね
    # （同時にデータベースに保存される
    
    if form.is_valid():
        @database_sync_to_async
        def save_message():
            chat_message = form.save(commit=False) # chat_messageを編集していくよ
            if request.FILES.get('image'):
                chat_image = ChatImage(image=request.FILES['image'])#画像は別クラス管理なのでここで作成
                chat_image.save()
                chat_message.image = chat_image #chat_messageのフィールドに生成した画像オブジェクトをセット。
            chatroom = ChatRoom.objects.get(id=roomid)
            chat_message.room = chatroom
            chat_message.user = request.user
            #編集完了

            chat_message.save()

            #結果を返す

            t_url = chat_image.thumbnail.url if chat_image.thumbnail else ""
            i_url = chat_image.image.url if chat_image.image else ""
            return (
                    chat_message.content,
                    t_url,
                    i_url
                )

        content, thumbnail_url, image_url = await save_message()

        channel_layer = get_channel_layer()
        group_name = str(roomid)
        print(thumbnail_url," ",image_url)

        # チャットメッセージをグループに送信
        await channel_layer.group_send(group_name,{
            'type': 'send_message',
            'server_message_type' : 'chat',
            'name': request.user.account_id,
            'content' : content,
            'thumbnail_url': thumbnail_url,
            'image_url': image_url
        })
        
        return {'success': True}
    return {'success': False, 'errors': form.errors}