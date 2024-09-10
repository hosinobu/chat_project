import hashlib
import threading
from os import path
from django import template
from django.conf import settings

register = template.Library()


class UrlCache(object):
    _md5_sum = {}
    _lock = threading.Lock()

    @classmethod
    def get_md5(cls, file):
        value = '%s%s' % (settings.STATIC_URL, file)
        if not settings.DEBUG:
            try:
                return cls._md5_sum[file]
            except KeyError:
                with cls._lock:
                    try:
                        md5 = cls.calc_md5(path.join(settings.STATIC_ROOT, file))[:8]
                        value += '?v=%s' % md5
                    except IsADirectoryError:
                        pass
                    cls._md5_sum[file] = value
                    return value
        return value

    @classmethod
    def calc_md5(cls, file_path):
        with open(file_path, 'rb') as fh:
            m = hashlib.md5()
            while True:
                data = fh.read(8192)
                if not data:
                    break
                m.update(data)
            return m.hexdigest()


@register.simple_tag
def md5url(model_object):
    return UrlCache.get_md5(model_object)
