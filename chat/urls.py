from django.urls import path


from . import views

app_name = "chat"

urlpatterns = [
	path('<int:roomid>/',views.room_view, name = "room"),
	path('lobby/', views.lobby_view, name="lobby"),
	path('test/', views.test_ios_view),
	path('test2/', views.test_ios_view2)
]
