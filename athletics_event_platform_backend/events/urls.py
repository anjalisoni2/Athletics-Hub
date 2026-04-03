from django.urls import path
from . import views

urlpatterns = [

    # Root Test (So "/" does not give 404)
    path('', views.home, name='home'),

    # Approved & Tracking
    path('approved-events/', views.approved_events, name='approved-events'),
    path('tracking/', views.tracking_view, name='tracking'),

    # Event Creation
    path('create-event/', views.api_create_event, name='api_create_event'),
    path('events/create/', views.create_event_page, name='create_event_page'),

    # Super Admin
    path('super-admin/events/', views.super_admin_events, name='super-admin-events'),

    # Registration
    path('register/', views.registration_page, name='registration_page'),
    path('register-event/', views.register_event, name='register-event'),

    # Thank You & Receipt
    path('thankyou/', views.thankyou, name='thankyou'),
    path('thank-you/<int:reg_id>/', views.thankyou, name='thank-you'),
    path('download-receipt/<int:reg_id>/', views.download_receipt, name='download_receipt'),

    # Event Approval APIs
    path('pending-events/', views.pending_events, name='pending_events'),
    path('events/<int:event_id>/approve/', views.approve_event),
    path('events/<int:event_id>/reject/', views.reject_event),

    # Organizer Registrations
    path('organizer/registrations/', views.organizer_registrations, name='organizer-registrations'),
    path('events/<int:event_id>/registrations/', views.event_registrations, name='event-registrations'),


    # Organizer Approvals API
    path('api/organizers/pending/', views.get_pending_organizers, name='pending-organizers'),
    path('api/organizers/<int:id>/approve/', views.approve_organizer, name='approve-organizer'),
    path('api/organizers/<int:id>/reject/', views.reject_organizer, name='reject-organizer'),
    path('api/organizers/status/<str:username>/', views.check_organizer_status, name='check-organizer-status'),

    # Notifications API
    path('api/notifications/', views.get_notifications, name='get-notifications'),
    path('api/notifications/mark-read/', views.mark_notification_read, name='mark-notification-read'),
    path('api/notifications/mark-all-read/', views.mark_all_notifications_read, name='mark-all-notifications-read'),

    # Organizer Email Settings
    path('api/organizer/email-settings/', views.update_organizer_email_settings, name='update-email-settings'),
    path('api/organizer/email-settings/get/', views.get_organizer_email_settings, name='get-email-settings'),

    # Super Admin Email Settings
    path('api/superadmin/email-settings/', views.update_superadmin_email_settings, name='update-superadmin-email-settings'),
    path('api/superadmin/email-settings/get/', views.get_superadmin_email_settings, name='get-superadmin-email-settings'),


    # Statistics & Reports
    path('user-statistics/', views.user_statistics, name='user-statistics'),
    path('event-participation/', views.event_participation, name='event-participation'),
    path('organizers-report/', views.organizers_report, name='organizers-report'),
    path('all-organizer-events/', views.all_organizer_events, name='all-organizer-events'),

    # Signup & Login
    path('signup-api/', views.signup_api),
    path('signup/', views.signup_api), # Alias for frontend compatibility
    path('login-api/', views.login_api),
    path('login/', views.login_api), # Alias for frontend compatibility

    # Fitness APIs
    path('fitness/create/', views.create_fitness_data, name='create-fitness-data'),
    path('fitness/data/', views.get_fitness_data, name='get-fitness-data'),
    path('fitness/summary/', views.get_fitness_summary, name='get-fitness-summary'),
    path('fitness/receive/', views.receive_fitness_data, name='receive-fitness-data'),

    # Volunteers
    path('volunteers/', views.create_volunteer),
    path('organizer/volunteers/', views.get_volunteers),
    path('volunteers/<int:id>/status/', views.update_volunteer_status, name='update-volunteer-status'),

    # Live Metrics
    path('live-metrics/', views.live_metrics),
]