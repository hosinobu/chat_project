# Generated by Django 5.1 on 2024-08-31 11:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_customuser_is_active_customuser_is_staff_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='account_id',
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
