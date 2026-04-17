import os

file_path = "events/views.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

replacement = """# APPROVE EVENT
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
            
            organizer_profile = getattr(event.created_by, 'organizerprofile', None)
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
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines[:393])
    f.write(replacement)
    if not replacement.endswith('\\n'):
        f.write('\\n')
    f.writelines(lines[454:])

print("Successfully replaced content.")
