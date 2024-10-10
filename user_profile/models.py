from django.db import models
from django.contrib.auth import get_user_model
from PIL import Image

class Profile(models.Model):
    user = models.OneToOneField(get_user_model(), on_delete=models.CASCADE)
    bio = models.TextField(default="よろしくお願いします", verbose_name="自己紹介")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="アバター")
    
    def __str__(self):
        return self.user.account_id
    
	    # 画像のリサイズを行うためにsaveメソッドをオーバーライド
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)  # まず画像を一度保存

        # 画像のリサイズ処理
        if self.avatar:
            img = Image.open(self.avatar.path)  # 画像ファイルを開く

            # 画像の幅が300pxを超えていたら縮小する
            if img.height > 300 or img.width > 300:
                output_size = (300, 300)  # サイズの上限を設定
                img.thumbnail(output_size)  # サイズを変更
                img.save(self.avatar.path)  # リサイズした画像を保存