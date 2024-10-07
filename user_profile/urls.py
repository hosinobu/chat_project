from django.urls import path
from django.conf import settings
from django.conf.urls.static import static


from . import views

app_name = "user_profile"

urlpatterns = [
	path('<int:userid>/edit', views.editview, name = "user_edit"),
	path('<int:userid>/', views.topview, name = "user_top"),
]