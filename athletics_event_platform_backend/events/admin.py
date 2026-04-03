from django.contrib import admin
from .models import Event, Registration, OrganizerProfile, AthleteProfile, SuperAdminProfile, Volunteer, FitnessData, AthleteRaceTracking, Notification
admin.site.register(AthleteRaceTracking)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category',
        'status',
        'created_by',
        'approved_by',
        'start_date'
    )
    list_filter = ('status', 'category')
    search_fields = ('name', 'location')
    actions = ['approve_events', 'reject_events']

    def approve_events(self, request, queryset):
        queryset.update(status='approved', approved_by=request.user)

    def reject_events(self, request, queryset):
        queryset.update(status='rejected', approved_by=request.user)

    approve_events.short_description = "Approve selected events"
    reject_events.short_description = "Reject selected events"


class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'mobile', 'gender',
                    'event_name', 'amount', 'emergency_contact', 'medical_condition', 'registered_at')
    ordering = ('registered_at',)
    list_filter = ('gender', 'event_name', 'registered_at')
    search_fields = ('first_name', 'last_name', 'email')

admin.site.register(Registration, EventRegistrationAdmin)


# Register OrganizerProfile
@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_email', 'organization_name', 'mobile', 'get_full_name')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'organization_name')
    list_filter = ('organization_name',)
    readonly_fields = ('user',)

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    get_full_name.short_description = 'Full Name'


# Register AthleteProfile
@admin.register(AthleteProfile)
class AthleteProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_email', 'mobile', 'gender', 'get_full_name')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    list_filter = ('gender',)

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    get_full_name.short_description = 'Full Name'


# Register SuperAdminProfile
@admin.register(SuperAdminProfile)
class SuperAdminProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_email', 'mobile', 'get_full_name')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('user',)

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    get_full_name.short_description = 'Full Name'


@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'role', 'event_name', 'status')
    list_filter = ('status', 'role', 'event_name')
    search_fields = ('first_name', 'last_name', 'email', 'event_name')


@admin.register(FitnessData)
class FitnessDataAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'steps', 'distance', 'calories', 'heart_rate', 'active_minutes')
    search_fields = ('user__username',)
    list_filter = ('date',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('user', 'notification_type', 'title', 'message', 'created_at')
