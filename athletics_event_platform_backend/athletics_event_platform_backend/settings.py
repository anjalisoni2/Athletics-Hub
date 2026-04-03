"""
Django settings for athletics_event_platform_backend project.
Updated for Vercel backend + Netlify frontend.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent


# ========================
# SECURITY
# ========================

SECRET_KEY = 'django-insecure-1@nln&1%f!_mg&a8cj9@xl14=(v*x)^gys)5+rzso6!$)b$4d%'
DEBUG = True

ALLOWED_HOSTS = [
    "athletics-hub-woad.vercel.app",
    ".vercel.app",
    "localhost",
    "127.0.0.1",
]


# ========================
# APPLICATIONS
# ========================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'events.apps.EventsConfig',
    'corsheaders',
]


# ========================
# DATABASE (Supabase)
# ========================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'postgres',
        'USER': 'postgres.egxguktdbohhhkspkvth',
        'PASSWORD': '@1008$Dinesh',
        'HOST': 'aws-1-ap-south-1.pooler.supabase.com',
        'PORT': '5432',
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}


# ========================
# CORS & CSRF (FIXED)
# ========================

CORS_ALLOW_CREDENTIALS = True

# For development: allow any localhost port
CORS_ALLOWED_ORIGINS = [
    "https://athleticsevent.netlify.app",
    "https://athletics-hub-woad.vercel.app",
]

if DEBUG:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://127\.0\.0\.1:\d+$",
        r"^http://localhost:\d+$",
    ]

CSRF_TRUSTED_ORIGINS = [
    "https://athleticsevent.netlify.app",
    "https://athletics-hub-woad.vercel.app",
]

if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        "http://127.0.0.1:*",
        "http://localhost:*",
    ])


# ========================
# MIDDLEWARE
# ========================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'athletics_event_platform_backend.urls'


# ========================
# TEMPLATES
# ========================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'athletics_event_platform_backend.wsgi.application'


# ========================
# PASSWORD VALIDATION
# ========================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ========================
# INTERNATIONALIZATION
# ========================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ========================
# STATIC FILES
# ========================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ========================
# MEDIA FILES
# ========================

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# ========================
# EMAIL CONFIGURATION
# ========================

env_path = BASE_DIR / '.env'
load_dotenv(env_path)

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'athleticsevents@gmail.com')


# ========================
# FRONTEND URL (IMPORTANT)
# ========================

FRONTEND_URL = "https://athleticsevent.netlify.app"


# ========================
# DEFAULT PRIMARY KEY
# ========================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
