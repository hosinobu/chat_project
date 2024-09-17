from django.shortcuts import render
from django.contrib.auth import login, authenticate
from django.contrib.auth.views import LoginView, LogoutView
from django.views.generic import TemplateView,CreateView
from django.urls import reverse_lazy
from .forms import SignUpForm, LoginForm

class IndexView(TemplateView):
	template_name = "index.html"

class SignupView(CreateView):
	template_name = "signup.html"
	form_class = SignUpForm
	success_url = reverse_lazy("accounts:index")
	def form_valid(self,form):
		response = super().form_valid(form)
		user = authenticate(
			account_id = form.cleaned_data.get("account_id"),
			password = form.cleaned_data.get("password1")
		)
		if user is not None:
			login(self.request, user)
			print("User logged in:", self.request.user.is_authenticated)  # ログイン後の状態を確認
		else:
			print("Authentication failed.")
		return response
	
class CustomLoginView(LoginView):
	form_class = LoginForm
	template_name = "login.html"

class CustomLogoutView(LogoutView):
	success_url = reverse_lazy("accounts:index")
