# chat/signals.py
from django.dispatch import receiver
from django.db.models.signals import post_save, post_delete
from .models import ChatMessage, ChatRoom, ChatImage
import os
import threading
@receiver(post_save, sender=ChatMessage)
def my_model_post_save(sender, instance, created, **kwargs):
    if created:
        print(f"新しい ChatMessage オブジェクトが作成されました: {instance}")
    else:
        print(f"ChatMessage オブジェクトが更新されました: {instance}")

@receiver(post_delete, sender = ChatImage)
def delete_image_file(sender, instance, **kwargs):
    if instance.image:
        print("画像あり")
        if os.path.isfile(instance.image.path):
            threading.Thread(target = os.remove, args=(instance.image.path,), daemon = True)

    if instance.thumbnail:
        print("サムネイルあり")
        if os.path.isfile(instance.thumbnail.path):
            threading.Thread(target=os.remove, args=(instance.thumbnail.path,), daemon = True)

@receiver(post_delete, sender = ChatMessage)
def delete_chatMessage(sender, instance, **kwargs):
    print("メッセージが削除された")
    if instance.image:
        post_delete.send(sender = ChatImage, instance = instance.image)
        
@receiver(post_delete, sender= ChatRoom)
def delete_chat_room(sender, instance, **kwargs):
    print("部屋が削除された")