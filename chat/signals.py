# chat/signals.py
from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import ChatMessage, ChatRoom

@receiver(post_save, sender=ChatMessage)
def my_model_post_save(sender, instance, created, **kwargs):
    if created:
        print(f"新しい ChatMessage オブジェクトが作成されました: {instance}")
    else:
        print(f"ChatMessage オブジェクトが更新されました: {instance}")