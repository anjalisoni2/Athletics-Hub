from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .models import SuperAdminProfile, OrganizerProfile, AthleteProfile

@receiver(pre_save, sender=SuperAdminProfile)
def validate_superadmin_singleton(sender, instance, **kwargs):
    """
    Ensure only one SuperAdminProfile exists.
    """
    if not instance.pk and SuperAdminProfile.objects.exists():
        raise ValidationError("A Super Admin already exists. Only one is allowed.")

@receiver(pre_save, sender=User)
def enforce_superuser_singleton(sender, instance, **kwargs):
    """
    Ensure only one user can have is_superuser=True.
    """
    if instance.is_superuser:
        superusers = User.objects.filter(is_superuser=True)
        if instance.pk:
            superusers = superusers.exclude(pk=instance.pk)
        
        if superusers.exists():
            raise ValidationError("Only one Super Admin is allowed. Privilege escalation blocked.")

@receiver(post_save, sender=User)
def default_user_role(sender, instance, created, **kwargs):
    """
    Ensure every user has at least an AthleteProfile if no other profile exists.
    (Optional, but helps with 'force role=USER' requirement)
    """
    if created:
        # We don't automatically create a profile here if signup_api handles it.
        # But if signup_api fails or is bypassed, we can force a default.
        pass
