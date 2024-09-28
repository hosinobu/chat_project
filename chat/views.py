from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views import View
from . import models
import logging
from asgiref.sync import sync_to_async
from .utils import handle_chat_message

logger = logging.getLogger(__name__)


class LobbyView(View):
	
	async def get(self, request):
		return await sync_to_async(render)(request, "lobby.html")
	
	async def post(self, request, roomid):
		logger.info('lobby_post')
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			result = await handle_chat_message(request, roomid)
			return JsonResponse(result)
		return JsonResponse({'success':False, 'errors': 'Unexpected request'})



class RoomView(View):

	async def get(self, request, roomid):
		room = await sync_to_async(get_object_or_404)(models.ChatRoom, id = roomid)
		return await sync_to_async(render)(request, "room.html", {"room":room})
	
	async def post(self, request, roomid):
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			result = await handle_chat_message(request, roomid)
			return JsonResponse(result)
		return JsonResponse({'success':False, 'errors': 'Unexpected request'})
		