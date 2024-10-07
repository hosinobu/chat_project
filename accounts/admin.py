from django.contrib import admin
from .models import CustomUser
from user_profile.models import Profile

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False

class CustomUserAdmin(admin.ModelAdmin):
    inlines = (ProfileInline,)

admin.site.register(CustomUser, CustomUserAdmin)