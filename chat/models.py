from django.db import models
from accounts.models import CustomUser
# Create your models here.


class ChatRoom(models.Model):
	name = models.CharField(max_length=30, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)
	users = models.ManyToManyField(CustomUser, blank=True)

	def __str__(self):
		return f"部屋->{self.name}"

class ChatMessage(models.Model):
	content = models.TextField(blank = True)
	image = models.ImageField(upload_to='chat_images/', blank=True, null= True)
	timestamp = models.DateTimeField(auto_now_add = True)
	room = models.ForeignKey(ChatRoom, on_delete = models.CASCADE)
	user = models.ForeignKey(CustomUser, on_delete = models.DO_NOTHING)

	def __str__(self):
		return f"{self.user} -> {self.content[:50]}"

class ChatRoomLog(models.Model):
	log_data = models.TextField()
	room = models.ForeignKey(ChatRoom, on_delete = models.CASCADE)

	def __str__(self):
		return f"Log for {self.room.name}"