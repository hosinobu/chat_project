from django import forms
from accounts.models import CustomUser

class ProfileEditForm(forms.ModelForm):
	class Meta:
		model = CustomUser
		fields = [
			'profile',
		]