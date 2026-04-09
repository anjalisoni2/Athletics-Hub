#!/usr/bin/env python
"""
Simple Socket.IO Server for Live Athletics Tracking
This broadcasts runner location updates every 2 seconds
"""

import socketio
import random
import time
import threading

# Create Socket.IO server with CORS enabled for all origins
sio = socketio.Server(
    async_mode='threading',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)
sio.eio.websocket = False

# Create a simple WSGI app wrapper
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

# Store connected clients
clients = set()

@sio.event
def connect(sid, environ):
    """Client connected"""
    print(f"\n✓ Client connected: {sid}")
    clients.add(sid)
    print(f"Total clients: {len(clients)}")

@sio.event
def disconnect(sid):
    """Client disconnected"""
    print(f"\n✗ Client disconnected: {sid}")
    clients.discard(sid)
    print(f"Total clients: {len(clients)}")


    """Broadcast runner location data every 2 seconds"""
    print("\n🏃 Starting runner location broadcasts...\n")
    
    # Initialize 4 runners with different starting positions
    runners = [
        {'id': '101', 'name': 'Runner 1', 'lat': 23.0225, 'lng': 72.5714},
        {'id': '102', 'name': 'Runner 2', 'lat': 23.0226, 'lng': 72.5715},
        {'id': '103', 'name': 'Runner 3', 'lat': 23.0224, 'lng': 72.5713},
        {'id': '104', 'name': 'Runner 4', 'lat': 23.0225, 'lng': 72.5716},
    ]
    
    # Target finish line
    finish_lat = 23.0300
    finish_lng = 72.5800
    
    broadcast_count = 0
    
    while True:
        try:
            if len(clients) > 0:
                for runner in runners:
                    # Calculate direction to finish
                    lat_diff = finish_lat - runner['lat']
                    lng_diff = finish_lng - runner['lng']
                    
                    # Move runner towards finish with randomness
                    runner['lat'] += lat_diff * 0.012 + (random.random() - 0.5) * 0.0003
                    runner['lng'] += lng_diff * 0.012 + (random.random() - 0.5) * 0.0003
                    
                    # Don't go past finish
                    if runner['lat'] > finish_lat:
                        runner['lat'] = finish_lat
                    if runner['lng'] > finish_lng:
                        runner['lng'] = finish_lng
                    
                    # Emit to all connected clients
                    sio.emit('runner_location', {
                        'bibNumber': runner['id'],
                        'name': runner['name'],
                        'lat': round(runner['lat'], 6),
                        'lng': round(runner['lng'], 6)
                    })
                
                broadcast_count += 1
                if broadcast_count % 5 == 0:  # Log every 10 seconds
                    print(f"📍 Broadcast #{broadcast_count}: {len(clients)} client(s) connected")
            
            # Wait 2 seconds before next broadcast
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
            time.sleep(2)

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🏃 ATHLETICS EVENT PLATFORM - Socket.IO TRACKER SERVER")
    print("="*70)
    print("\n📡 Server Configuration:")
    print("   • Address: 0.0.0.0:5000")
    print("   • Async: eventlet")
    print("   • CORS: Enabled for all origins")
    print("   • WebSocket: Yes")
    print("   • Polling: Fallback available")
    print("\n🔗 Frontend should connect to: http://localhost:5000")
    print("\n⚠️  Make sure this server is running BEFORE accessing the map!")
    print("="*70 + "\n")

   # Store latest runner locations
runner_locations = {}

@sio.on('send_location')
def receive_location(sid, data):
    """
    Receive REAL GPS from runner device
    """
    try:
        bib = str(data.get('bibNumber'))
        lat = float(data.get('lat'))
        lng = float(data.get('lng'))
        name = data.get('name', f"Runner {bib}")

        # Save latest location
        runner_locations[bib] = {
            "bibNumber": bib,
            "name": name,
            "lat": lat,
            "lng": lng
        }

        # Broadcast to ALL viewers
        sio.emit('runner_location', runner_locations[bib])

        print(f"📍 {name} → {lat}, {lng}")

    except Exception as e:
        print("❌ GPS Receive Error:", e)
 
    
    
    # Start the server
    try:
        print("🚀 Starting server... waiting for connections...\n")
        
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped by user")
        exit(0)
    except Exception as e:
        print(f"\n\n❌ Server error: {e}")
        exit(1)
from wsgiref import simple_server

server = simple_server.make_server('0.0.0.0', 5000, app)
server.serve_forever()
