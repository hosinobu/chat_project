from .models import ChatRoom

def create_lobby(sender, **kwargs):
    if not ChatRoom.objects.filter(name='__system_lobby').exists():
        ChatRoom.objects.create(name='__system_lobby')
        print('Lobby created')