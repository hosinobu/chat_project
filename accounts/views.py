from django.shortcuts import render
from django.contrib.auth import login, authenticate
from django.contrib.auth.views import LoginView, LogoutView
from django.views.generic import TemplateView,CreateView
from django.urls import reverse_lazy
from .forms import SignUpForm, LoginForm
# Create your views here.

class IndexView(TemplateView):
	template_name = "index.html"

class SignupView(CreateView):
	template_name = "signup.html"
	form_class = SignUpForm
	success_url = reverse_lazy("accounts:index")
	def form_valid(self,form):
		response = super().form_valid(form)
		a = form.cleaned_data.get("account_id")
		b = form.cleaned_data.get("password1")
		print("Attempting authentication with:")
		print("Account ID:", a)
		print("Password:", b)  # 注意: パスワードをログに出力するのはセキュリティ上のリスクがあります。
		user = authenticate(account_id = a, password = b)
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
