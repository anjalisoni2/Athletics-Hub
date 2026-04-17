from django.db import models
from django.contrib.auth.models import User


# =========================
# EVENT MODEL
# =========================

class Event(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50)
    location = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    distance = models.CharField(max_length=50, blank=True, null=True)
    max_participants = models.IntegerField(blank=True, null=True)
    fee = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    image = models.ImageField(upload_to='events/', null=True, blank=True)
    description = models.TextField(blank=True)
    overview = models.TextField(blank=True)

    created_by = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_events'
    )

    def __str__(self):
        return self.name


# =========================
# REGISTRATION MODEL
# =========================

class Registration(models.Model):

    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='registrations'
    )

    event = models.ForeignKey(
        Event,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='registrations'
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    mobile = models.CharField(max_length=15)
    gender = models.CharField(max_length=10)
    event_name = models.CharField(max_length=200)
    amount = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact = models.CharField(max_length=15)
    medical_condition = models.TextField(blank=True, null=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=50, default='confirmed', null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# =========================
# ORGANIZER PROFILE
# =========================

class OrganizerProfile(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    organization_name = models.CharField(max_length=200, blank=True)
    mobile = models.CharField(max_length=15, blank=True)
    website = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    
    # Email settings for sending notifications
    email_host = models.CharField(max_length=255, blank=True, help_text='SMTP server (e.g., smtp.gmail.com)')
    email_port = models.IntegerField(default=587)
    email_use_tls = models.BooleanField(default=True)
    email_host_user = models.EmailField(blank=True, help_text='Email address for sending')
    email_host_password = models.CharField(max_length=255, blank=True, help_text='App password')
    email_from_name = models.CharField(max_length=100, blank=True, default='Athletics Events')

    def __str__(self):
        return f"{self.user.username} - {self.organization_name}"
    
    def has_email_configured(self):
        return bool(self.email_host and self.email_host_user and self.email_host_password)


# =========================
# ATHLETE PROFILE
# =========================

class AthleteProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    mobile = models.CharField(max_length=15)
    gender = models.CharField(max_length=10)


from django.core.exceptions import ValidationError

# =========================
# SUPER ADMIN PROFILE
# =========================

class SuperAdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    mobile = models.CharField(max_length=15, blank=True)
    
    # Email settings for super admin
    email_host = models.CharField(max_length=255, blank=True, default='smtp.gmail.com')
    email_port = models.IntegerField(default=587)
    email_use_tls = models.BooleanField(default=True)
    email_host_user = models.EmailField(blank=True)
    email_host_password = models.CharField(max_length=255, blank=True)
    email_from_name = models.CharField(max_length=100, blank=True, default='Athletics Events Admin')

    def clean(self):
        # Prevent more than one SuperAdminProfile
        if not self.pk and SuperAdminProfile.objects.exists():
            raise ValidationError("A Super Admin already exists. Only one is allowed.")
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} (Super Admin)"
    
    def has_email_configured(self):
        return bool(self.email_host and self.email_host_user and self.email_host_password)


# =========================
# NOTIFICATION MODEL
# =========================

class Notification(models.Model):
    TYPE_CHOICES = [
        ('approval', 'Approval'),
        ('rejection', 'Rejection'),
        ('general', 'General'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


# =========================
# FITNESS DATA
# =========================

class FitnessData(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fitness_data')
    date = models.DateField()
    steps = models.IntegerField(default=0)
    distance = models.FloatField(default=0.0)
    calories = models.FloatField(default=0.0)
    heart_rate = models.IntegerField(default=0)
    active_minutes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date}"


# =========================
# VOLUNTEER MODEL
# =========================

class Volunteer(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    event_id = models.CharField(max_length=50)
    event_name = models.CharField(max_length=255)

    role = models.CharField(max_length=50)
    availability = models.JSONField(default=list)
    skills = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} - {self.event_name}"


# =========================
# ATHLETE RACE TRACKING
# =========================

class AthleteRaceTracking(models.Model):

    athlete = models.CharField(max_length=100)
    event = models.CharField(max_length=100)

    start_time = models.DateTimeField(null=True, blank=True)
    finish_time = models.DateTimeField(null=True, blank=True)

    current_speed = models.FloatField(default=0)
    average_speed = models.FloatField(default=0)
    distance = models.FloatField(default=0)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.athlete} - {self.event}"


