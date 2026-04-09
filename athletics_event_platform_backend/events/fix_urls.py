import sys
import os
filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'urls.py')

with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

target = "path('pending-events/', views.pending_events, name='pending_events'),"
replacement = "path('approved-events/', views.approved_events, name='approved_events'),\n    " + target

if "path('approved-events/'" not in content:
    content = content.replace(target, replacement)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added approved-events to urls.py")
else:
    print("Already added")