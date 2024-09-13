from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

app_name = "chat"

urlpatterns = [
	path('<int:roomid>/',views.room_view, name = "room"),
	path('lobby/', views.lobby_view, name="lobby"),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)