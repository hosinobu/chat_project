from django.urls import path


from .views import LobbyView,RoomView

app_name = "chat"

urlpatterns = [
	path('<int:roomid>/', RoomView.as_view(), name = "room"),
	path('lobby/', LobbyView.as_view(), name="lobby"),
]
