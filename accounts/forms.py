from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import CustomUser


class SignUpForm(UserCreationForm):
	class Meta:
		model = CustomUser
		fields = (
			'account_id',
		)

class LoginForm(AuthenticationForm):
	class Meta:
		model = CustomUser