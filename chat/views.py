from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404
from django.views import View
from . import models
import logging

logger = logging.getLogger(__name__)

def my_view(request):
	logger.info("このメッセージは情報レベルのログです")
	return HttpResponse("ログが記録されました。")
# Create your views here.

class LobbyView(View):
	def get(self,request):
		return render(request, "lobby.html")
lobby_view = LobbyView.as_view()

class RoomView(View):
	def get(self,request, roomid):
		room = get_object_or_404(models.ChatRoom, id = roomid)
		return render(request, "room.html", {"room":room})
room_view = RoomView.as_view()