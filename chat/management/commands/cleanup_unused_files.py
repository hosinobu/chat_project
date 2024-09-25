from chat.utils import cleanup_unused_files
from django.core.management.base import BaseCommand

class Command(BaseCommand):
	help = 'Unused files cleanup'

	def handle(self, *args, **kwargs):
		cleanup_unused_files()
		self.stdout.write(self.style.SUCCESS('Unused files have been cleaned up successfully.'))