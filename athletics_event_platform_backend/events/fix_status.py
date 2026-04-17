import sys
import os

filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'views.py')

with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status='PENDING'", "status='APPROVED'")

with open(filename, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')