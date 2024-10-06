from django.shortcuts import render, redirect
from accounts.models import CustomUser
from .forms import ProfileEditForm
# Create your views here.
def topview(request, userid):
	print("topviewが呼ばれたよ")
	
	user = CustomUser.objects.get(id = userid)
	data = {
		"user":user,
		"is_owner": user == request.user
	}
	return render(request, "user_profile_top.html" ,data)

def editview(request, userid):
	print(request.method)
	user = CustomUser.objects.get(id = userid)
	if request.method == 'POST':
		print(request.POST)
		form = ProfileEditForm(request.POST, instance = user)
		if form.is_valid():
			form.save()
			return redirect('user_profile:user_top', userid)
		else:
			print(form.errors)
			return redirect('user_profile:user_top', userid)
	else:

		form = ProfileEditForm(instance = user)
		data = {
			"user":user,
			"is_owner": user == request.user,
			"form": form
		}

		return render(request, "user_profile_edit.html",data)