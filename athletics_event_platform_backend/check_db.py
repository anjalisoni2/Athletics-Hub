import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athletics_event_platform_backend.settings')
django.setup()

from events.models import OrganizerProfile, User

def check_organizers():
    all_orgs = OrganizerProfile.objects.all()
    print(f"Total OrganizerProfiles: {all_orgs.count()}")
    for org in all_orgs:
        print(f"User: {org.user.username}, Status: {org.status}")

    pending = OrganizerProfile.objects.filter(status__iexact='pending')
    print(f"Pending OrganizerProfiles: {pending.count()}")

if __name__ == "__main__":
    import sys
    with open("check_db.log", "w") as f:
        sys.stdout = f
        try:
            check_organizers()
        except Exception as e:
            f.write(f"ERROR: {str(e)}")
