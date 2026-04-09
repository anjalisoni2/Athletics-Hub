# Socket.IO Server Setup - Live Tracking

## What You Need
The map displays runners in real-time using a Socket.IO server. This guide explains how to set it up.

---

## STEP 1: Install Required Packages

Open a terminal/command prompt and run:

```bash
pip install python-socketio eventlet
```

**Output should show:**
```
Successfully installed python-socketio eventlet...
```

---

## STEP 2: Check Port 5000 is Free

**Windows - PowerShell:**
```powershell
netstat -ano | findstr :5000
```

**Mac/Linux - Terminal:**
```bash
lsof -i :5000
```

If something is running on port 5000, you must stop it first.

---

## STEP 3: Run the Socket Server

Navigate to the project root directory (where `socket_server.py` is located) and run:

```bash
python socket_server.py
```

**Expected Output:**
```
======================================================================
🏃 ATHLETICS EVENT PLATFORM - Socket.IO TRACKER SERVER
======================================================================

📡 Server Configuration:
   • Address: 0.0.0.0:5000
   • Async: eventlet
   • CORS: Enabled for all origins
   • WebSocket: Yes
   • Polling: Fallback available

🔗 Frontend should connect to: http://localhost:5000

⚠️  Make sure this server is running BEFORE accessing the map!
======================================================================

✓ Broadcast thread started

🚀 Starting server... waiting for connections...
```

**✓ Server is now running!** Keep this terminal open while using the app.

---

## STEP 4: Open Live Tracking Map

1. **Start your Django development server** (if not already running)
2. **Navigate to the Live Tracking page** in your application
3. **Click the "Track Map" tab** to view the interactive map

---

## STEP 5: Check Connection in Browser Console

Open your browser's **Developer Console** (F12 or Right-click → Inspect → Console tab)

**You should see:**
```
📡 Attempting to connect to Socket.IO server at http://localhost:5000...
✅ SUCCESS! Connected to Socket.IO server
   Socket ID: (some-random-id)
📍 Runner location update: 101
📍 Runner location update: 102
...
```

---

## Troubleshooting

### ❌ Error: "Port 5000 already in use"
**Fix:** Change port in socket_server.py
```python
eventlet.listen(('0.0.0.0', 5000))  # Change 5000 to 5001, 5002, etc.
```
Then update the frontend connection:
```javascript
socket = io('http://localhost:5001', ...)
```

### ❌ Error: "Connection refused" or "ERR_CONNECTION_REFUSED"
**Fix:** Make sure socket_server.py is running
```bash
python socket_server.py
```

### ❌ Map loads but no live runners
**Check:**
1. Is socket_server.py running? (check terminal)
2. Open browser console (F12)
3. Look for error messages starting with ❌
4. Check if "✅ SUCCESS! Connected" appears in console

### ❌ "ModuleNotFoundError: No module named 'socketio'"
**Fix:** Install the required packages
```bash
pip install python-socketio eventlet
```

### ⚠️ "WebSocket connection failed"
**Fix:** This is normal if server is not running. The map will work with mock data (simulated runners).

---

## How It Works

1. **Socket Server** (socket_server.py)
   - Runs on port 5000
   - Broadcasts runner location every 2 seconds
   - Simulates 4 runners moving from start to finish

2. **Frontend** (live-tracking.js)
   - Connects to socket server
   - Receives location updates
   - Updates map markers in real-time
   - Falls back to mock data if server unavailable

3. **Leaflet Map**
   - Displays runners as colored markers
   - Shows route history as polylines
   - Has start/finish line markers
   - Checkpoints along the route

---

## Expected Map Features

✓ 4 colored runner markers  
✓ Runner routes (polylines) on map  
✓ Start line marker (gray)  
✓ Finish line marker (red)  
✓ Checkpoints (green)  
✓ Real-time position updates every 2 seconds  
✓ Popup info on marker click  

---

## Keep Server Running

**The socket server MUST keep running** while you use the live tracking feature.

To stop it: Press **Ctrl + C** in the terminal where it's running.

---

## Production Note

For production, you would connect this to:
- **Real GPS data** from runners' devices
- **Django backend** via API/database
- **Multiple event tracking** support
- **Persistent storage** of runner data

For now, it broadcasts **simulated test data** so you can see it working.

---

Need help? Check browser console for detailed error messages!
