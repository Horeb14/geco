import os
import sys

# Remplace "Horeb14" par ton username PythonAnywhere
path = '/home/Horeb14/geco/backend'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
