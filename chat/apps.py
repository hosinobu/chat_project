from django.apps import AppConfig

class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'

    def ready(self):

        from django.db.models.signals import post_migrate
        from .signals import create_lobby

        post_migrate.connect(create_lobby, sender = self)

