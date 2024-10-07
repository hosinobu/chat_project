from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import get_user_model
from .forms import ProfileEditForm
from .models import Profile

def topview(request, userid):
	
	user = get_user_model().objects.get(id = userid)
	profile, created = Profile.objects.get_or_create(user=user)
	data = {
		"user":user,
		"is_owner": user == request.user
	}
	return render(request, "user_profile_top.html" ,data)

def editview(request, userid):
	
	print(request.method)
	user = get_user_model().objects.get(id = userid)
	profile, created = Profile.objects.get_or_create(user=user)

	if request.method == 'POST':
		print(request.POST)
		form = ProfileEditForm(request.POST, request.FILES, instance = profile)
		if form.is_valid():
			form.save()
			return redirect('user_profile:user_top', userid)
		else:
			print(form.errors)
			return redirect('user_profile:user_top', userid)
	else:

		form = ProfileEditForm(instance = profile)
		data = {
			"user":user,
			"is_owner": user == request.user,
			"form": form
		}

		return render(request, "user_profile_edit.html",data)