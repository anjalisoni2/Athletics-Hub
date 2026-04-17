from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
import json
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
from django.db import models
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status

from .models import Event, Registration, Volunteer, OrganizerProfile, AthleteProfile, SuperAdminProfile, Notification
from .serializers import EventSerializer, VolunteerSerializer
from math import radians, sin, cos, sqrt, atan2
from django.conf import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email_from_organizer(organizer_profile, subject, message, recipient_list):
    """Send email using organizer's SMTP settings or fall back to super admin settings."""
    try:
        # First try organizer's own email settings
        if organizer_profile and organizer_profile.has_email_configured():
            print(f"Using organizer's SMTP: {organizer_profile.email_host}")
            smtp_host = organizer_profile.email_host
            smtp_port = organizer_profile.email_port
            smtp_user = organizer_profile.email_host_user
            smtp_password = organizer_profile.email_host_password
            from_name = organizer_profile.email_from_name
            
            from_email = f"{from_name} <{smtp_user}>"
            
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = ', '.join(recipient_list)
            msg['Subject'] = subject
            msg.attach(MIMEText(message, 'plain'))
            
            if organizer_profile.email_use_tls:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
                server.starttls()
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, recipient_list, msg.as_string())
            server.quit()
            print(f"Email sent successfully to {recipient_list}")
            return True
        else:
            # Try super admin's email settings
            return send_email_from_superadmin(subject, message, recipient_list)
    except Exception as e:
        print(f"Email sending failed: {type(e).__name__}: {str(e)}")
        return False


def send_email_from_superadmin(subject, message, recipient_list):
    """
    Send email notification to users.
    
    For PRODUCTION deployment:
    1. Set environment variables on your hosting platform (Railway/Render/etc.)
    2. Or configure SMTP in settings.py
    
    Environment variables to set:
    - EMAIL_HOST_USER: your-email@gmail.com
    - EMAIL_HOST_PASSWORD: your-app-password
    
    For testing locally:
    - Emails will be printed to console
    """
    from django.conf import settings
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Get email settings (from environment or settings.py)
    smtp_host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
    smtp_port = getattr(settings, 'EMAIL_PORT', 587)
    smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
    smtp_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@athleticshub.com')
    use_tls = getattr(settings, 'EMAIL_USE_TLS', True)
    
    # If no credentials, print to console (for local testing)
    if not smtp_user or not smtp_password or smtp_user == '':
        print("=" * 60)
        print(f"📧 EMAIL (No SMTP configured - for testing only)")
        print(f"To: {recipient_list}")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(message)
        print("=" * 60)
        print("\n💡 To enable real emails, set these environment variables:")
        print("   EMAIL_HOST_USER=your-email@gmail.com")
        print("   EMAIL_HOST_PASSWORD=your-app-password")
        print("=" * 60)
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = ', '.join(recipient_list)
        msg['Subject'] = subject
        msg.attach(MIMEText(message, 'plain'))
        
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, recipient_list, msg.as_string())
        server.quit()
        
        print(f"✅ Email sent to {recipient_list}")
        return True
    except Exception as e:
        print(f"❌ Email failed: {str(e)}")
        # Fallback to console
        print("=" * 60)
        print(f"📧 EMAIL (fallback to console)")
        print(f"To: {recipient_list}")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(message)
        print("=" * 60)
        return True

@login_required
def create_event(request):
    if request.method == 'POST':
        try:
            event = Event.objects.create(
                name=request.POST.get('name'),
                category=request.POST.get('category'),
                location=request.POST.get('location'),
                start_date=request.POST.get('start_date'),
                end_date=request.POST.get('end_date'),
                start_time=request.POST.get('start_time'),
                end_time=request.POST.get('end_time'),
                distance=request.POST.get('distance') or None,
                max_participants=request.POST.get('max_participants') or None,
                fee=request.POST.get('fee') or None,
                description=request.POST.get('description'),
                image=request.FILES.get('image'),  # ✅ THIS is your banner
                created_by=request.user,
                status='PENDING'
            )
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    return JsonResponse({'status': 'error', 'message': 'Invalid request'})

from rest_framework.decorators import api_view
from rest_framework.response import Response
from .serializers import EventSerializer

@login_required
def super_admin_events(request):
    events = Event.objects.all().order_by('-id')  # latest first
    serializer = EventSerializer(events, many=True, context={'request': request})
    return Response(serializer.data)

# views.py


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse,HttpResponse
from .models import Registration

@csrf_exempt
def register_event(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'})

    try:
        event_name = request.POST.get('event_name')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        mobile = request.POST.get('mobile')
        gender = request.POST.get('gender')
        amount = request.POST.get('amount')
        emergency_contact = request.POST.get('emergency_contact')
        medical_condition = request.POST.get('medical_condition')

        if not event_name or not first_name or not email:
            return JsonResponse({'status': 'error', 'error': 'Missing required fields'})

        # Try to get the event by name
        event = None
        try:
            event = Event.objects.get(name=event_name)
        except Event.DoesNotExist:
            pass

        # Get the current logged-in user if available
        user = request.user if request.user.is_authenticated else None

        registration = Registration.objects.create(
            event_name=event_name,
            event=event,
            user=user,
            first_name=first_name,
            last_name=last_name,
            email=email,
            mobile=mobile,
            gender=gender,
            amount=amount or 0,
            emergency_contact=emergency_contact,
            medical_condition=medical_condition,
            role='athlete',
            status='confirmed'
        )

        return JsonResponse({'status': 'success', 'reg_id': registration.id})
    except Exception as e:
        import traceback
        return JsonResponse({'status': 'error', 'error': str(e), 'trace': traceback.format_exc()})


#event - register.html
from django.shortcuts import render, redirect
from .models import Registration

def registration_page(request):
    if request.method == "POST":
        first_name = request.POST.get("first_name")
        last_name = request.POST.get("last_name")
        email = request.POST.get("email")
        mobile = request.POST.get("mobile")
        gender = request.POST.get("gender")
        event_name = request.POST.get("event_name")
        amount = request.POST.get("amount") or 0
        emergency_contact = request.POST.get("emergency_contact")
        medical_condition = request.POST.get("medical_condition", "")

        # Try to get the event by name
        event = None
        try:
            event = Event.objects.get(name=event_name)
        except Event.DoesNotExist:
            pass

        # Get the current logged-in user if available
        user = request.user if request.user.is_authenticated else None

        registration = Registration.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            mobile=mobile,
            gender=gender,
            event_name=event_name,
            event=event,  # Link to event if found
            user=user,    # Link to user if authenticated
            amount=amount,
            emergency_contact=emergency_contact,
            medical_condition=medical_condition
        )

        # Redirect to thank you page with registration id
        return redirect("thank-you", reg_id=registration.id)

    return render(request, "events/register.html")

    

def thankyou(request):
    return render(request, 'events/thankyou.html')


def download_receipt(request, reg_id):
    # Fetch registration
    try:
        reg = Registration.objects.get(id=reg_id)
        content = f"""
        Receipt for {reg.first_name} {reg.last_name}
        Event: {reg.event_name}
        Amount Paid: {reg.amount}
        """
        response = HttpResponse(content, content_type='text/plain')
        response['Content-Disposition'] = f'attachment; filename="receipt_{reg_id}.txt"'
        return response
    except Registration.DoesNotExist:
        return HttpResponse("Receipt not found", status=404)


# views.py
from django.http import JsonResponse
from .models import Event

# CSRF exempt if calling from live server
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def api_create_event(request):
    if request.method == 'POST':
        try:
            # SECURITY: Priority for organizer assignment
            # 1. Use logged-in user if available (most secure)
            # 2. Use created_by_username from POST as fallback
            created_by = None
            if request.user.is_authenticated:
                created_by = request.user
            else:
                created_by_username = request.POST.get('created_by_username')
                if created_by_username:
                    try:
                        created_by = User.objects.get(username=created_by_username)
                    except User.DoesNotExist:
                        pass

            # Get location from either 'location' or combined 'Start_location' and 'End_location'
            location = request.POST.get('location')
            if not location:
                start_loc = request.POST.get('Start_location') or ''
                end_loc = request.POST.get('End_location') or ''
                location = f"{start_loc} to {end_loc}" if start_loc and end_loc else start_loc or end_loc or 'Not specified'

            event = Event.objects.create(
                name=request.POST.get('name'),
                category=request.POST.get('category'),
                location=location,
                start_date=request.POST.get('start_date'),
                end_date=request.POST.get('end_date'),
                start_time=request.POST.get('start_time'),
                end_time=request.POST.get('end_time'),
                distance=request.POST.get('distance') or None,
                max_participants=request.POST.get('max_participants') or None,
                fee=request.POST.get('fee') or None,
                description=request.POST.get('description'),
                image=request.FILES.get('image'),
                created_by=created_by,
                status='PENDING'  # All events created through payment require approval
            )

            # Build absolute image URL to send to frontend
            imageUrl = ''
            if event.image:
                # Use deployed backend URL for consistency across frontend and backend
                deployed_backend = 'https://athletics-hub.onrender.com'
                # imageUrl = f"{deployed_backend}{event.image.url}"
                imageUrl = request.build_absolute_uri(event.image.url)

            return JsonResponse({
                'status': 'success',
                'event_id': event.id,
                'imageUrl': imageUrl
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def create_event_page(request):
    return render(request, 'event.html')

# pending events
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Event

@api_view(["GET"])
@permission_classes([AllowAny])
def pending_events(request):
    events = Event.objects.filter(status__iexact="PENDING").select_related('created_by')

    return Response([
        {
            "id": e.id,
            "title": e.name,                    # ✔ from form
            "date": e.start_date,               # ✔ model field
            "maxParticipants": e.max_participants,
            "price": e.fee,
            "currency": "USD",
            "imageUrl": request.build_absolute_uri(e.image.url) if e.image else "",
            "organizer": e.created_by.username or e.created_by.email if e.created_by else "Event Organizer",
            "createdByUsername": e.created_by.username if e.created_by else None,
            "createdBy": e.created_by.username or e.created_by.email if e.created_by else None,
        }
        for e in events
    ])


# APPROVE EVENT
@api_view(["POST"])
@permission_classes([AllowAny])
def approve_event(request, event_id):
    try:
        event = Event.objects.get(id=event_id)
        event.status = "APPROVED"
        event.save()
        
        if event.created_by:
            Notification.objects.create(
                user=event.created_by,
                notification_type='approval',
                title='Event Approved!',
                message=f'Your event "{event.name}" has been approved and is now live!'
            )
            
            email_subject = f'Your Event "{event.name}" Has Been Approved!'
            email_message = f'''Dear {event.created_by.first_name} {event.created_by.last_name},

Great news! Your event has been approved.

Event Details:
- Name: {event.name}
- Date: {event.start_date}
- Location: {event.location}

Your event is now live and visible to participants.

Best regards,
Athletics Events Platform Team
'''
            organizer_profile = getattr(event.created_by, 'organizerprofile', None)
            send_email_from_organizer(organizer_profile, email_subject, email_message, [event.created_by.email])
            
        return Response({"status": "APPROVED"})
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=404)


# REJECT EVENT
@api_view(["POST"])
@permission_classes([AllowAny])
def reject_event(request, event_id):
    try:
        event = Event.objects.get(id=event_id)
        event.status = "REJECTED"
        event.save()

        if event.created_by:
            Notification.objects.create(
                user=event.created_by,
                notification_type='rejection',
                title='Event Rejected',
                message=f'Your event "{event.name}" has been rejected. Please contact support for more information.'
            )
            
            organizer_profile = getattr(event.created_by, 'organizerprofile', None)
            email_subject = f'Your Event "{event.name}" Has Been Rejected'
            email_message = f'''Dear {event.created_by.first_name} {event.created_by.last_name},

We regret to inform you that your event has been rejected.

Event Details:
- Name: {event.name}
- Date: {event.start_date}
- Location: {event.location}

If you believe this was a mistake, please contact our support team.

Best regards,
Athletics Events Platform Team
'''
            send_email_from_organizer(organizer_profile, email_subject, email_message, [event.created_by.email])
        
        return Response({"status": "REJECTED"})
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=404)

#     return Response([
#         {
#             "id": e.id,
#             "title": e.name,
#             "date": e.start_date,
#             "location": e.location,
#             "maxParticipants": e.max_participants,
#             "price": e.fee,
#             "imageUrl": e.image.url if e.image else "",

#         }
#         for e in events
#      ])


@api_view(["GET"])
@permission_classes([AllowAny])
def approved_events(request):
    organizer_username = request.query_params.get('organizer_username')
    
    events = Event.objects.filter(status__iexact="APPROVED").select_related('created_by').annotate(participant_count=Count('registrations'))
    
    # If username provided, filter by that organizer
    if organizer_username:
        events = events.filter(created_by__username=organizer_username)
    
    return Response([
        {
            "id": e.id,
            "title": e.name,
            "description": e.description,
            "date": e.start_date,
            "location": e.location,
            "distance": e.distance,
            "category": e.category,
            "price": e.fee,
            "maxParticipants": e.max_participants,
            "participants": e.participant_count,
            "organizer": e.created_by.username or e.created_by.email or "Event Organizer" if e.created_by else "Event Organizer",
            "createdByUsername": e.created_by.username if e.created_by else None,
            "createdBy": e.created_by.username or e.created_by.email if e.created_by else None,
            "registrationDeadline": e.end_date,
            "imageUrl": request.build_absolute_uri(e.image.url) if e.image else "",
        }
        for e in events
    ])



# API endpoint for organizer to view registrations for their events
@api_view(["GET"])
def organizer_registrations(request):
    """
    Get all registrations for events created by the logged-in organizer
    """
    user = request.user
    organizer_username = request.query_params.get('organizer_username')
    
    # SECURITY: Ensure organizers can only see their own registrations
    if user.is_authenticated:
        # If organizer, ignore param and use session user
        if hasattr(user, 'organizerprofile'):
            pass # user is already session user
        # If super admin, allow viewing any organizer's data via param
        elif (user.is_superuser or hasattr(user, 'superadminprofile')) and organizer_username:
            try:
                user = User.objects.get(username=organizer_username)
            except User.DoesNotExist:
                return Response({'error': 'Organizer not found'}, status=404)
    elif organizer_username:
        # Fallback for unauthenticated access with param (careful here)
        try:
            user = User.objects.get(username=organizer_username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
    else:
        return Response({'error': 'Authentication required'}, status=401)
        
    # Get all events created by this organizer
    organizer_events = Event.objects.filter(created_by=user)
    
    # Get all registrations for these events
    registrations = Registration.objects.filter(event__in=organizer_events).order_by('-registered_at')
    
    return Response([
        {
            "id": reg.id,
            "firstName": reg.first_name,
            "lastName": reg.last_name,
            "email": reg.email,
            "mobile": reg.mobile,
            "gender": reg.gender,
            "eventName": reg.event.name if reg.event else reg.event_name,
            "eventId": reg.event.id if reg.event else None,
            "amount": reg.amount,
            "emergencyContact": reg.emergency_contact,
            "medicalCondition": reg.medical_condition,
            "registeredAt": reg.registered_at,
            "athleteName": f"{reg.user.first_name} {reg.user.last_name}" if reg.user else f"{reg.first_name} {reg.last_name}",
        }
        for reg in registrations
    ])


# API endpoint to get registrations for a specific event
@api_view(["GET"])
def event_registrations(request, event_id):
    """
    Get all registrations for a specific event (only if user is the event organizer)
    """
    try:
        event = Event.objects.get(id=event_id)
        
        # Check if user is the organizer
        if event.created_by != request.user and not request.user.is_superuser:
            return Response({"error": "You do not have permission to view these registrations"}, status=403)
        
        registrations = Registration.objects.filter(event=event).order_by('-registered_at')
        
        return Response([
            {
                "id": reg.id,
                "firstName": reg.first_name,
                "lastName": reg.last_name,
                "email": reg.email,
                "mobile": reg.mobile,
                "gender": reg.gender,
                "amount": reg.amount,
                "emergencyContact": reg.emergency_contact,
                "medicalCondition": reg.medical_condition,
                "registeredAt": reg.registered_at,
            }
            for reg in registrations
        ])
    except Event.DoesNotExist:
        return Response({"error": "Event not found"}, status=404)


#serializers
from rest_framework.decorators import APIView
from rest_framework.response import Response
from .models import Event
from .serializers import EventSerializer

class ApprovedEventsAPIView(APIView):
    def get(self, request):
        events = Event.objects.filter(status='APPROVED')
        from .serializers import ApprovedEventSerializer
        serializer = ApprovedEventSerializer(events, many=True, context={'request': request})
        return Response(serializer.data)


# USER STATISTICS API ENDPOINT
from django.utils import timezone
from datetime import timedelta

@api_view(["GET"])
def user_statistics(request):
    """
    Get user statistics for admin dashboard
    Returns user count, active users, role distribution, and registration trends
    """
    from django.contrib.auth.models import User

    # Get all users
    all_users = User.objects.all()
    total_users = all_users.count()

    # Get active users (users who logged in within last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    active_users = all_users.filter(last_login__gte=seven_days_ago).count()

    # Count users by role (from Registration model)
    # Athletes are those with registrations
    athletes = Registration.objects.values('email').distinct().count()

    # Organizers are users who have created events
    organizers = Event.objects.values('created_by').distinct().count()

    # Registration trends
    today = timezone.now().date()
    registered_today = User.objects.filter(date_joined__date=today).count()

    week_ago = today - timedelta(days=7)
    registered_this_week = User.objects.filter(date_joined__date__gte=week_ago).count()

    month_ago = today - timedelta(days=30)
    registered_this_month = User.objects.filter(date_joined__date__gte=month_ago).count()

    # Generate growth data for last 7 days
    growth_data = []
    for i in range(7, 0, -1):
        date = today - timedelta(days=i)
        count = User.objects.filter(date_joined__date__lte=date).count()
        growth_data.append({
            'date': date.isoformat(),
            'count': count
        })

    return Response({
        'totalUsers': total_users,
        'activeUsers': active_users,
        'athletes': athletes,
        'organizers': organizers,
        'registeredToday': registered_today,
        'registeredThisWeek': registered_this_week,
        'registeredThisMonth': registered_this_month,
        'userGrowthData': {
            'days': [f'Day {i}' for i in range(1, 8)],
            'data': [item['count'] for item in growth_data]
        }
    })


# EVENT PARTICIPATION API ENDPOINT
@api_view(["GET"])
def event_participation(request):
    """
    Get event participation data for chart visualization
    Returns list of events with their athlete participation counts
    """
    events = Event.objects.filter(status__iexact="APPROVED").select_related('created_by').annotate(participant_count=Count('registrations'))

    event_participation_list = []
    for event in events:
        event_participation_list.append({
            'eventId': event.id,
            'eventName': event.name,
            'participantCount': event.participant_count,
            'organizer': event.created_by.username if event.created_by else "Event Organizer"
        })

    # Sort by participant count descending
    event_participation_list.sort(key=lambda x: x['participantCount'], reverse=True)

    return Response(event_participation_list)


# GET ALL EVENTS BY ORGANIZERS (for report)
@api_view(["GET"])
def all_organizer_events(request):
    """
    Get all events created by organizers (for the organizers report)
    Returns list of events with organizer information
    """
    all_events = Event.objects.all().select_related('created_by').annotate(participant_count=Count('registrations'))

    events_list = []
    for event in all_events:
        organizer_name = "Event Organizer"
        created_by_username = None
        if event.created_by:
            organizer_name = event.created_by.username or event.created_by.email or f"{event.created_by.first_name} {event.created_by.last_name}".strip()
            created_by_username = event.created_by.username

        events_list.append({
            'id': event.id,
            'title': event.name,
            'organizer': organizer_name,
            'createdByUsername': created_by_username,
            'createdBy': created_by_username,
            'status': event.status,
            'date': str(event.start_date) if event.start_date else None,
            'participants': event.participant_count
        })

    return Response(events_list)


# ORGANIZERS REPORT API ENDPOINT
@api_view(["GET"])
def organizers_report(request):
    """
    Get organizers report with event counts
    Returns list of organizers and how many events each has created
    """
    from django.contrib.auth.models import User

    try:
        # Get all events (regardless of status)
        all_events = Event.objects.all().select_related('created_by')

        # Build organizer statistics
        organizer_stats = {}

        for event in all_events:
            if event.created_by:
                user = event.created_by
                user_key = user.id

                if user_key not in organizer_stats:
                    organizer_stats[user_key] = {
                        'organizerId': user.id,
                        'organizerName': user.username or f"{user.first_name} {user.last_name}".strip() or user.email,
                        'organizerEmail': user.email,
                        'eventCount': 0,
                        'status': 'active'
                    }

                organizer_stats[user_key]['eventCount'] += 1

        # Convert to list and sort by event count
        organizers_list = list(organizer_stats.values())
        organizers_list.sort(key=lambda x: x['eventCount'], reverse=True)

        total_events = sum(org['eventCount'] for org in organizers_list)

        response_data = {
            'totalOrganizers': len(organizers_list),
            'totalEvents': total_events,
            'organizers': organizers_list
        }

        return Response(response_data)

    except Exception as e:
        print(f"Error in organizers_report: {str(e)}")
        return Response({
            'totalOrganizers': 0,
            'totalEvents': 0,
            'organizers': [],
            'error': str(e)
        }, status=200)

from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.http import JsonResponse
import json

@csrf_exempt
def signup_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            first_name = data.get("firstName", "")
            last_name = data.get("lastName", "")
            mobile = data.get("mobile", "")
            
            # SECURITY: Accept role from frontend but strictly block SuperAdmin
            # Default to 'participant' if not provided
            role = data.get("role", "participant").lower()
            
            if role == 'superadmin':
                role = 'participant' # Block privilege escalation

            # Check if user already exists
            if User.objects.filter(username=username).exists():
                return JsonResponse({"status": "error", "message": "User exists"})

            # Create Django User
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            # Create the appropriate profile
            if role == 'organizer':
                from .models import OrganizerProfile
                OrganizerProfile.objects.create(
                    user=user,
                    mobile=mobile,
                    organization_name=data.get("organizationName", ""),
                    status='pending'
                )

                email_subject = 'Organizer Signup Request Received'
                email_message = f'''Dear {first_name} {last_name},

Your organizer signup request has been received successfully.

Username: {username}
Organization: {data.get("organizationName", "")}

Your request is now waiting for admin approval. We will notify you once it has been reviewed.

Best regards,
Athletics Events Platform Team
'''
                send_email_from_superadmin(email_subject, email_message, [email])
            else:
                # Default to AthleteProfile
                from .models import AthleteProfile
                AthleteProfile.objects.create(
                    user=user,
                    mobile=mobile,
                    gender=""
                )

            if role == 'organizer':
                return JsonResponse({
                    "status": "success",
                    "message": "Organizer signup request submitted and is waiting for admin approval",
                    "userId": user.id,
                    "username": username,
                    "role": role,
                    "approvalStatus": "pending"
                })

            return JsonResponse({
                "status": "success",
                "message": "User created successfully",
                "userId": user.id,
                "username": username,
                "role": role,
                "approvalStatus": "approved"
            })

        except Exception as e:
            import traceback
            print(f"Signup error: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({"status": "error", "message": str(e)})

    return JsonResponse({"status": "error", "message": "Invalid request method"})

@csrf_exempt
def login_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")

            from django.contrib.auth import authenticate
            user = authenticate(username=username, password=password)

            if user is not None:
                # SECURITY: Optional Super Admin restriction by email/username
                # Example: only allow 'admin@example.com' or 'superadmin' username
                is_sa_profile = hasattr(user, 'superadminprofile')
                if is_sa_profile or user.is_superuser:
                    # You can customize these allowed identifiers
                    ALLOWED_SUPER_ADMINS = ['admin', 'superadmin', 'root', 'admin@example.com']
                    if user.username not in ALLOWED_SUPER_ADMINS and user.email not in ALLOWED_SUPER_ADMINS:
                        return JsonResponse({"status": "error", "message": "Access restricted for this Super Admin account"}, status=403)

                # Determine role based on which profile exists
                role = "participant"
                firstName = user.first_name
                lastName = user.last_name
                email = user.email
                mobile = ""

                if hasattr(user, 'organizerprofile'):
                    role = "organizer"
                    # NEW: ENFORCE APPROVAL BEFORE LOGIN
                    org_status = user.organizerprofile.status.lower()
                    if org_status == 'pending':
                        return JsonResponse({"status": "error", "message": "Your organizer account is pending approval by an administrator."} , status=403)
                    elif org_status == 'rejected':
                        return JsonResponse({"status": "error", "message": "Your organizer account request has been rejected."} , status=403)

                    mobile = user.organizerprofile.mobile
                elif hasattr(user, 'superadminprofile') or user.is_superuser:
                    role = "superadmin"
                    mobile = user.superadminprofile.mobile if hasattr(user, 'superadminprofile') else ""
                elif hasattr(user, 'athleteprofile'):
                    role = "participant"
                    mobile = user.athleteprofile.mobile

                from django.contrib.auth import login
                login(request, user)

                return JsonResponse({
                    "status": "success",
                    "username": user.username,
                    "firstName": firstName,
                    "lastName": lastName,
                    "email": email,
                    "role": role,
                    "mobile": mobile,
                    "approvalStatus": "approved"
                })
            else:
                return JsonResponse({"status": "error", "message": "Invalid username or password"}, status=401)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Only POST allowed"}, status=405)


# ============ FITNESS DATA API ENDPOINTS ============

from .models import FitnessData
from datetime import datetime, timedelta

@csrf_exempt
@api_view(["POST"])
def create_fitness_data(request):
    """
    Create or update fitness data for the logged-in athlete
    Expected POST data: date, steps, distance, calories, heart_rate, active_minutes
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response({"status": "error", "message": "User not authenticated"}, status=401)

        data = request.data
        date = data.get('date')

        if not date:
            return Response({"status": "error", "message": "Date is required"}, status=400)

        fitness_data, created = FitnessData.objects.update_or_create(
            user=user,
            date=date,
            defaults={
                'steps': int(data.get('steps', 0)),
                'distance': float(data.get('distance', 0.0)),
                'calories': float(data.get('calories', 0.0)),
                'heart_rate': int(data.get('heart_rate', 0)),
                'active_minutes': int(data.get('active_minutes', 0)),
            }
        )

        return Response({
            "status": "success",
            "message": "Fitness data saved successfully",
            "data": {
                "id": fitness_data.id,
                "date": fitness_data.date,
                "steps": fitness_data.steps,
                "distance": fitness_data.distance,
                "calories": fitness_data.calories,
                "heart_rate": fitness_data.heart_rate,
                "active_minutes": fitness_data.active_minutes,
            }
        })
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)


@api_view(["GET"])
def get_fitness_data(request):
    """
    Get fitness data for the logged-in athlete
    Query params: date (optional), limit (optional)
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response({"status": "error", "message": "User not authenticated"}, status=401)

        date = request.query_params.get('date')
        limit = request.query_params.get('limit', 30)

        fitness_data = FitnessData.objects.filter(user=user).order_by('-date')

        if date:
            fitness_data = fitness_data.filter(date=date)

        try:
            limit = int(limit)
            fitness_data = fitness_data[:limit]
        except ValueError:
            pass

        data_list = [{
            "id": f.id,
            "date": f.date,
            "steps": f.steps,
            "distance": f.distance,
            "calories": f.calories,
            "heart_rate": f.heart_rate,
            "active_minutes": f.active_minutes,
        } for f in fitness_data]

        return Response({
            "status": "success",
            "data": data_list,
            "count": len(data_list)
        })
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)


@api_view(["GET"])
def get_fitness_summary(request):
    """
    Get fitness summary for a date range
    Query params: start_date, end_date, period (optional: week, month)
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response({"status": "error", "message": "User not authenticated"}, status=401)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period', 'week')

        if not start_date or not end_date:
            return Response({"status": "error", "message": "start_date and end_date are required"}, status=400)

        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()

        fitness_data = FitnessData.objects.filter(
            user=user,
            date__gte=start,
            date__lte=end
        ).order_by('date')

        if not fitness_data.exists():
            # Return empty data structure if no data found
            return Response({
                "status": "success",
                "summary": {
                    "total_steps": 0,
                    "total_distance": 0.0,
                    "total_calories": 0.0,
                    "avg_heart_rate": 0,
                    "total_active_minutes": 0,
                },
                "daily_breakdown": [],
                "period": period
            })

        # Calculate summary
        total_steps = sum(f.steps for f in fitness_data)
        total_distance = sum(f.distance for f in fitness_data)
        total_calories = sum(f.calories for f in fitness_data)
        avg_heart_rate = int(sum(f.heart_rate for f in fitness_data) / len(fitness_data)) if fitness_data.count() > 0 else 0
        total_active_minutes = sum(f.active_minutes for f in fitness_data)

        daily_breakdown = [{
            "date": f.date,
            "steps": f.steps,
            "distance": f.distance,
            "calories": f.calories,
            "heart_rate": f.heart_rate,
            "active_minutes": f.active_minutes,
        } for f in fitness_data]

        return Response({
            "status": "success",
            "summary": {
                "total_steps": total_steps,
                "total_distance": round(total_distance, 2),
                "total_calories": round(total_calories, 2),
                "avg_heart_rate": avg_heart_rate,
                "total_active_minutes": total_active_minutes,
            },
            "daily_breakdown": daily_breakdown,
            "period": period
        })
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def receive_fitness_data(request):
    """
    Receive fitness data from Android Health Connect webhook/integration
    This endpoint accepts fitness data from external sources and saves it
    """
    try:
        # Try to get user from auth header or request body
        user = request.user
        user_id = request.data.get('user_id') if request.data else request.POST.get('user_id')

        # If not authenticated, try to get user by ID
        if not user.is_authenticated and user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)

        if not user.is_authenticated:
            return Response({"status": "error", "message": "User not authenticated"}, status=401)

        data = request.data if request.data else request.POST

        date = data.get('date')
        if not date:
            return Response({"status": "error", "message": "Date is required"}, status=400)

        fitness_data, created = FitnessData.objects.update_or_create(
            user=user,
            date=date,
            defaults={
                'steps': int(data.get('steps', 0)),
                'distance': float(data.get('distance', 0.0)),
                'calories': float(data.get('calories', 0.0)),
                'heart_rate': int(data.get('heart_rate', 0)),
                'active_minutes': int(data.get('active_minutes', 0)),
            }
        )

        return Response({
            "status": "success",
            "message": f"Fitness data {'created' if created else 'updated'} successfully",
            "data": {
                "id": fitness_data.id,
                "date": fitness_data.date,
                "steps": fitness_data.steps,
                "distance": fitness_data.distance,
                "calories": fitness_data.calories,
                "heart_rate": fitness_data.heart_rate,
                "active_minutes": fitness_data.active_minutes,
            }
        })
    except Exception as e:
        import traceback
        print(f"Error in receive_fitness_data: {str(e)}")
        print(traceback.format_exc())
        return Response({"status": "error", "message": str(e)}, status=500)





from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Volunteer
from .serializers import VolunteerSerializer


@api_view(['POST'])
def create_volunteer(request):
    serializer = VolunteerSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_volunteers(request):
    """
    Get volunteers, strictly filtered by the current organizer
    """
    volunteers = Volunteer.objects.all().order_by('-created_at')
    
    user = request.user
    organizer_username = request.query_params.get('organizer_username')
    
    target_user = None
    if user.is_authenticated:
        if hasattr(user, 'organizerprofile'):
            target_user = user
        elif (user.is_superuser or hasattr(user, 'superadminprofile')) and organizer_username:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                target_user = User.objects.get(username=organizer_username)
            except User.DoesNotExist:
                pass
    elif organizer_username:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_user = User.objects.get(username=organizer_username)
        except User.DoesNotExist:
            pass

    if target_user:
        # Get all events for this organizer
        from .models import Event
        from django.db import models
        organizer_events = Event.objects.filter(created_by=target_user)
        event_names = list(organizer_events.values_list('name', flat=True))
        event_ids = list(organizer_events.values_list('id', flat=True))
        
        # Filter volunteers
        volunteers = volunteers.filter(
            models.Q(event_name__in=event_names) | 
            models.Q(event_id__in=[str(id) for id in event_ids])
        )

    serializer = VolunteerSerializer(volunteers, many=True)
    return Response(serializer.data)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Volunteer
from .serializers import VolunteerSerializer  # make sure you have this

@api_view(['PATCH'])
def update_volunteer_status(request, id):
    try:
        volunteer = Volunteer.objects.get(id=id)
    except Volunteer.DoesNotExist:
        return Response({"error": "Volunteer not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in ['approved', 'pending', 'rejected']:
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

    volunteer.status = new_status
    volunteer.save()

    serializer = VolunteerSerializer(volunteer)
    return Response(serializer.data)



R = 6371  # Earth radius

def calc_distance(lat1, lon1, lat2, lon2):
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat/2)**2 + cos(radians(lat1)) * \
        cos(radians(lat2)) * sin(dlon/2)**2

    return R * 2 * atan2(sqrt(a), sqrt(1-a))



@api_view(['POST'])
@permission_classes([AllowAny])   # allow requests
def live_metrics(request):

    data = json.loads(request.body)

    lat1 = data["prevLat"]
    lon1 = data["prevLng"]
    lat2 = data["lat"]
    lon2 = data["lng"]
    time_diff = data["timeDiff"]

    distance = calc_distance(lat1, lon1, lat2, lon2)

    speed = (distance / time_diff) * 3600 if time_diff else 0
    pace = 60 / speed if speed else 0

    return JsonResponse({
        "distance": round(distance, 3),
        "speed": round(speed, 2),
        "pace": round(pace, 2),
    })

from django.http import JsonResponse

def tracking_view(request):
    return JsonResponse({"message": "Tracking API working"})

# ORGANIZER APPROVAL APIs

@api_view(["GET"])
@permission_classes([AllowAny])
def get_pending_organizers(request):
    try:
        from .models import OrganizerProfile
        pending = OrganizerProfile.objects.filter(status__iexact='pending')
        data = []
        for org in pending:
            data.append({
                'id': org.id,
                'username': org.user.username,
                'email': org.user.email,
                'name': f"{org.user.first_name} {org.user.last_name}",
                'mobile': org.mobile,
                'status': org.status
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(["POST"])
@permission_classes([AllowAny])
def approve_organizer(request, id):
    try:
        org = OrganizerProfile.objects.get(id=id)
        org.status = 'approved'
        org.save()
        
        user = org.user
        
        Notification.objects.create(
            user=user,
            notification_type='approval',
            title='Account Approved!',
            message=f'Congratulations! Your organizer account for "{org.organization_name}" has been approved. You can now login to your account.'
        )
        
        email_subject = 'Your Organizer Account Request Has Been Accepted'
        email_message = f'''Dear {user.first_name} {user.last_name},

Congratulations! Your organizer account request has been accepted.

Organization: {org.organization_name}

You can now login to your organizer dashboard and start creating events.

Best regards,
Athletics Events Platform Team
'''

        send_email_from_superadmin(email_subject, email_message, [user.email])
        
        return Response({'status': 'approved', 'message': 'Organizer approved and notified'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(["POST"])
@permission_classes([AllowAny])
def reject_organizer(request, id):
    try:
        org = OrganizerProfile.objects.get(id=id)
        user = org.user
        org.status = 'rejected'
        org.save()
        
        Notification.objects.create(
            user=user,
            notification_type='rejection',
            title='Account Request Rejected',
            message=f'Your organizer account request for "{org.organization_name}" has been rejected. Please contact support for more information.'
        )
        
        email_subject = 'Your Organizer Account Request Status'
        email_message = f'''Dear {user.first_name} {user.last_name},

We regret to inform you that your organizer account request has been rejected.

Organization: {org.organization_name}

If you believe this was a mistake, please contact our support team for assistance.

Best regards,
Athletics Events Platform Team
'''
        
        send_email_from_organizer(org, email_subject, email_message, [user.email])
        
        return Response({'status': 'rejected', 'message': 'Organizer rejected and notified'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(["GET"])
@permission_classes([AllowAny])
def check_organizer_status(request, username):
    try:
        from .models import OrganizerProfile
        org = OrganizerProfile.objects.get(user__username=username)
        return Response({'status': org.status})
    except Exception:
        return Response({'status': None})


@api_view(["GET"])
@permission_classes([AllowAny])
def get_notifications(request):
    """
    Get notifications for a user
    """
    username = request.query_params.get('username')
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(username=username)
        notifications = Notification.objects.filter(user=user).order_by('-created_at')
        
        return Response([{
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'isRead': n.is_read,
            'createdAt': n.created_at
        } for n in notifications])
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def mark_notification_read(request):
    """
    Mark a notification as read
    """
    notification_id = request.data.get('notification_id')
    if not notification_id:
        return Response({'error': 'Notification ID required'}, status=400)
    
    try:
        notification = Notification.objects.get(id=notification_id)
        notification.is_read = True
        notification.save()
        return Response({'status': 'success'})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def mark_all_notifications_read(request):
    """
    Mark all notifications as read for a user
    """
    username = request.data.get('username')
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(username=username)
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({'status': 'success'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_organizer_profile(request):
    """
    Get profile details for the currently logged-in organizer
    """
    user = request.user
    organizer_username = request.query_params.get('username')
    
    target_user = None
    if user.is_authenticated and hasattr(user, 'organizerprofile'):
        target_user = user
    elif organizer_username:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_user = User.objects.get(username=organizer_username)
            if not hasattr(target_user, 'organizerprofile'):
                return Response({'error': 'User is not an organizer'}, status=400)
        except User.DoesNotExist:
            return Response({'error': 'Organizer not found'}, status=404)
    
    if not target_user:
        return Response({'error': 'Authentication required'}, status=401)
        
    profile = target_user.organizerprofile
    return Response({
        'username': target_user.username,
        'firstName': target_user.first_name,
        'lastName': target_user.last_name,
        'email': target_user.email,
        'organizationName': profile.organization_name,
        'mobile': profile.mobile,
        'website': profile.website,
        'description': profile.description,
        'status': profile.status
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def update_organizer_email_settings(request):
    """
    Update organizer's email/SMTP settings for sending notifications
    """
    username = request.data.get('username')
    email_host = request.data.get('email_host', '')
    email_port = request.data.get('email_port', 587)
    email_use_tls = request.data.get('email_use_tls', True)
    email_host_user = request.data.get('email_host_user', '')
    email_host_password = request.data.get('email_host_password', '')
    email_from_name = request.data.get('email_from_name', 'Athletics Events')
    
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        User = get_user_model()
        user = User.objects.get(username=username)
        
        if not hasattr(user, 'organizerprofile'):
            return Response({'error': 'User is not an organizer'}, status=400)
        
        profile = user.organizerprofile
        profile.email_host = email_host
        profile.email_port = int(email_port) if email_port else 587
        profile.email_use_tls = bool(email_use_tls)
        profile.email_host_user = email_host_user
        profile.email_host_password = email_host_password
        profile.email_from_name = email_from_name
        profile.save()
        
        return Response({'status': 'success', 'message': 'Email settings updated'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_organizer_email_settings(request):
    """
    Get organizer's email/SMTP settings (without password)
    """
    username = request.query_params.get('username')
    
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        User = get_user_model()
        user = User.objects.get(username=username)
        
        if not hasattr(user, 'organizerprofile'):
            return Response({'error': 'User is not an organizer'}, status=400)
        
        profile = user.organizerprofile
        return Response({
            'email_host': profile.email_host,
            'email_port': profile.email_port,
            'email_use_tls': profile.email_use_tls,
            'email_host_user': profile.email_host_user,
            'email_from_name': profile.email_from_name,
            'has_password': bool(profile.email_host_password)
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


def home(request):
    return JsonResponse({"message": "Backend is running successfully"})


# MEDIA FILE SERVING (for production with DEBUG=False)
import os
from django.http import FileResponse, HttpResponseNotFound
from django.views.static import serve

def serve_media(request, path):
    """
    Serve media files in production where Django's static serving doesn't work with DEBUG=False
    """
    from django.conf import settings
    import mimetypes
    file_path = os.path.join(settings.MEDIA_ROOT, path)

    # Security: Prevent directory traversal attacks
    file_path = os.path.abspath(file_path)
    media_root = os.path.abspath(settings.MEDIA_ROOT)

    if not file_path.startswith(media_root):
        return HttpResponseNotFound('File not found')

    if not os.path.exists(file_path):
        return HttpResponseNotFound('File not found')

    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = 'application/octet-stream'

    with open(file_path, 'rb') as f:
        return HttpResponse(f.read(), content_type=content_type)


# =========================
# SUPER ADMIN EMAIL SETTINGS
# =========================

@api_view(['POST'])
@permission_classes([AllowAny])
def update_superadmin_email_settings(request):
    """
    Update super admin's email/SMTP settings for sending notifications
    """
    username = request.data.get('username')
    email_host = request.data.get('email_host', 'smtp.gmail.com')
    email_port = request.data.get('email_port', 587)
    email_use_tls = request.data.get('email_use_tls', True)
    email_host_user = request.data.get('email_host_user', '')
    email_host_password = request.data.get('email_host_password', '')
    email_from_name = request.data.get('email_from_name', 'Athletics Events Admin')
    
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        User = get_user_model()
        user = User.objects.get(username=username)
        
        if not hasattr(user, 'superadminprofile'):
            return Response({'error': 'User is not a super admin'}, status=400)
        
        profile = user.superadminprofile
        profile.email_host = email_host
        profile.email_port = int(email_port) if email_port else 587
        profile.email_use_tls = bool(email_use_tls)
        profile.email_host_user = email_host_user
        profile.email_host_password = email_host_password
        profile.email_from_name = email_from_name
        profile.save()
        
        return Response({'status': 'success', 'message': 'Email settings updated'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_superadmin_email_settings(request):
    """
    Get super admin's email/SMTP settings (without password)
    """
    username = request.query_params.get('username')
    
    if not username:
        return Response({'error': 'Username required'}, status=400)
    
    try:
        User = get_user_model()
        user = User.objects.get(username=username)
        
        if not hasattr(user, 'superadminprofile'):
            return Response({'error': 'User is not a super admin'}, status=400)
        
        profile = user.superadminprofile
        return Response({
            'email_host': profile.email_host,
            'email_port': profile.email_port,
            'email_use_tls': profile.email_use_tls,
            'email_host_user': profile.email_host_user,
            'email_from_name': profile.email_from_name,
            'has_password': bool(profile.email_host_password)
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(open(file_path, 'rb'), as_attachment=False)

    return HttpResponseNotFound('File not found')
