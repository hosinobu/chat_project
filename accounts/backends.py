from django.contrib.auth.backends import ModelBackend
from .models import CustomUser  # カスタムユーザーモデルをインポート
import logging

logger = logging.getLogger(__name__)

class AccountIDBackend(ModelBackend):
    def authenticate(self, account_id=None, password=None):
        logger.debug("AccountIDBackend.authenticate called")
        try:
            user = CustomUser.objects.get(account_id=account_id)
        except CustomUser.DoesNotExist:
            return None
        if user.check_password(password):
            return user
        return None