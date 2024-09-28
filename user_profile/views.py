from django.shortcuts import render
from accounts.models import CustomUser
# Create your views here.
def topview(request, userid):
	print("topviewが呼ばれたよ")
	
	user = CustomUser.objects.get(id = userid)
	data = {
		"user":user,
		"is_owner": user == request.user
	}
	return render(request, "user_profile_top.html" ,data)
