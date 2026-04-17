// live-fitness-dashboard.js
import { createIcon } from "../utils.js";
import { mockEvents } from "../data.js";
import { getRegistrations } from "../storage.js";
import { getAPIEndpoint } from "../api-config.js";

// --- STATE MANAGEMENT ---
let raceStartTime = null;
let raceFinished = false;
let userPathCoordinates = [];
let trailPolyline = null;
let statsInterval = null;
let totalDistanceCovered = 0;
let currentActiveMap = null;
let runnerMarker = null;
let lastLat = null;
let lastLng = null;
let lastTime = Date.now();
function sendTrackingToBackend(payload) {
    fetch(getAPIEndpoint("/api/tracking/"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify(payload)
    }).catch(err => console.log("Tracking send error:", err));
}


// --- HELPER: Geocode any location name to coordinates ---
async function getCoordinates(locationName) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (err) { console.error("Geocoding failed:", err); }
    return [23.0225, 72.5714]; // Default Fallback
}

// --- DATA FETCHING ---
async function getFitnessData() {
    try {
        const response = await fetch(getAPIEndpoint(`/api/fitness/summary/`), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        return response.ok ? await response.json() : null;
    } catch (err) { return null; }
}

async function getTodayMetrics() {
    try {
        const response = await fetch(getAPIEndpoint(`/api/fitness/data/?limit=1`), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const data = await response.json();
            return data.data?.[0] || null;
        }
    } catch (err) { return null; }
    return null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- MAIN RENDERER ---
export async function renderFitnessDashboard(container) {
    const currentUser = localStorage.getItem("currentUser");
    const registrations = getRegistrations();
    const userPaidRegs = registrations.filter(reg => reg.username === currentUser && parseFloat(reg.amount) > 0);

    container.innerHTML = `<div class="p-8 text-center">Loading Dynamic Tracking...</div>`;

    const [fitnessData, todayMetrics] = await Promise.all([getFitnessData(), getTodayMetrics()]);

    // Fetch backend approved events to match with registrations
    let approvedEvents = [];
    try {
        const res = await fetch(getAPIEndpoint("/api/approved-events/"));
        if (res.ok) approvedEvents = await res.json();
    } catch (e) {}

    const allAvailableEvents = [...mockEvents, ...approvedEvents];
    const userEvents = userPaidRegs.map(reg => allAvailableEvents.find(e => String(e.id) === String(reg.eventId))).filter(e => e);

    // --- MODERNIZED UI (Logic stays 100% same) ---
    const dashboardHTML = `
        <div class="fitness-dashboard-v2">
            <header class="dashboard-header-v2">
                <div class="header-content">
                    <h1>Live Tracking</h1>
                    <div id="race-status" class="status-badge">${userEvents.length > 0 ? 'Ready' : 'No Registrations'}</div>
                </div>
                
                ${userEvents.length > 0 ? `
                <div class="selector-card">
                    <label>Select Event</label>
                    <select id="eventSelector">
                        ${userEvents.map(ev => `<option value="${ev.id}">${ev.title}</option>`).join('')}
                    </select>
                </div>` : ''}
            </header>

            ${userEvents.length > 0 ? `
            <div class="stats-grid-v2">
                <div class="stat-card blue">
                    <label>TIME</label>
                    <span id="live-timer" class="value">00:00:00</span>
                </div>
                <div class="stat-card purple">
                    <label>SPEED</label>
                    <div class="value-group">
                        <span id="live-speed" class="value">0.0</span>
                        <span class="unit">km/h</span>
                    </div>
                </div>
                <div class="stat-card green">
                    <label>DISTANCE</label>
                    <div class="value-group">
                        <span id="live-dist" class="value">0.00</span>
                        <span class="unit">km</span>
                    </div>
                </div>
                <div class="stat-card orange">
                    <label>AVG PACE</label>
                    <div class="value-group">
                        <span id="avg-speed" class="value">0.0</span>
                        <span class="unit">km/h</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="map-wrapper-v2">
                <div id="leaflet-map" class="map-element"></div>
                <div class="map-overlay">Satellite Signal Active</div>
            </div>
        </div>

        <style>
            .fitness-dashboard-v2 { background: #f8fafc; padding: 25px; font-family: 'Inter', sans-serif; min-height: 100vh; }
            
            .dashboard-header-v2 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
            .dashboard-header-v2 h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            
            .status-badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 5px; display: inline-block; }
            
            .selector-card { background: white; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .selector-card label { font-size: 10px; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 2px; }
            #eventSelector { border: none; font-weight: 600; color: #2563eb; outline: none; cursor: pointer; background: transparent; }

            .stats-grid-v2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .stat-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .stat-card.blue { border-top: 4px solid #3b82f6; }
            .stat-card.purple { border-top: 4px solid #8b5cf6; }
            .stat-card.green { border-top: 4px solid #10b981; }
            .stat-card.orange { border-top: 4px solid #f59e0b; }
            
            .stat-card label { color: #64748b; font-size: 11px; font-weight: 700; display: block; margin-bottom: 8px; }
            .stat-card .value { font-size: 28px; font-weight: 800; color: #1e293b; font-family: monospace; }
            .stat-card .unit { font-size: 14px; color: #94a3b8; margin-left: 4px; font-weight: 600; }

            .map-wrapper-v2 { border-radius: 24px; overflow: hidden; border: 8px solid white; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); position: relative; }
            .map-element { height: 500px; width: 100%; }
            .map-overlay { position: absolute; bottom: 20px; left: 20px; background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 30px; font-size: 12px; font-weight: 700; color: #ef4444; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        </style>
    `;

    container.innerHTML = dashboardHTML;

    if (userEvents.length > 0) {
        initRaceModeMap(userEvents[0]);

        document.getElementById('eventSelector').addEventListener('change', (e) => {
            const selected = userEvents.find(ev => String(ev.id) === String(e.target.value));
            if (selected) initRaceModeMap(selected);
        });
    }
}

// --- 🏁 ADVANCED DYNAMIC RACE LOGIC ---
async function initRaceModeMap(event) {
    const currentUser = localStorage.getItem("currentUser");
const eventId = event.id;

    if (statsInterval) clearInterval(statsInterval);
    raceStartTime = null;
    raceFinished = false;
    userPathCoordinates = [];
    totalDistanceCovered = 0;

    // Reset UI
    document.getElementById('live-timer').innerText = "00:00:00";
    document.getElementById('live-dist').innerText = "0.00";
    document.getElementById('avg-speed').innerText = "0.0";
    document.getElementById('race-status').innerText = `Status: Tracking ${event.title}`;

    const mapDiv = document.getElementById("leaflet-map");
    if (!mapDiv || typeof L === "undefined") return;
    if (currentActiveMap) currentActiveMap.remove();

    // DYNAMIC LOCATION: Find coordinates of the event's location name
    const locations = event.location.split(' to ');
    const startPos = await getCoordinates(locations[0]);
    const endPos = locations.length > 1 ? await getCoordinates(locations[1]) : [startPos[0] + 0.01, startPos[1] + 0.01];

    currentActiveMap = L.map('leaflet-map').setView(startPos, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(currentActiveMap);

    L.marker(startPos, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', iconSize: [25, 41] }) }).addTo(currentActiveMap).bindPopup("START: " + event.title);
    L.marker(endPos, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', iconSize: [25, 41] }) }).addTo(currentActiveMap).bindPopup("FINISH");


    runnerMarker = L.marker(startPos, {
    icon: L.divIcon({
        className: "runner-emoji",
        html: "🏃",
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    })
}).addTo(currentActiveMap);

runnerMarker.setZIndexOffset(1000);

    // Planned Route (Blue)
    fetch(`https://router.project-osrm.org/route/v1/driving/${startPos[1]},${startPos[0]};${endPos[1]},${endPos[0]}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (data.routes?.[0]) L.geoJSON(data.routes[0].geometry, { style: { color: "blue", weight: 4, opacity: 0.3 } }).addTo(currentActiveMap);
        });

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            if (raceFinished) return;

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const currentPos = [lat, lng];
            if (runnerMarker) {
    runnerMarker.setLatLng(currentPos);
}

            const speed = (pos.coords.speed || 0) * 3.6;

            // 1. AUTO START: Check distance from Start Line
            const distFromStart = calculateDistance(lat, lng, startPos[0], startPos[1]);
         if (distFromStart < 0.05 && !raceStartTime) {
    raceStartTime = new Date();
    document.getElementById('race-status').innerText = "🏃 EVENT STARTED!";
    startLiveTimer();

    sendTrackingToBackend({
        athlete: currentUser,
        event: eventId,
        start_time: raceStartTime,
        lat,
        lng
    });
}


            // 2. AUTO STOP: Check distance from Finish Line
            const distFromFinish = calculateDistance(lat, lng, endPos[0], endPos[1]);
           if (distFromFinish < 0.05 && raceStartTime && !raceFinished) {
    raceFinished = true;
    clearInterval(statsInterval);
    document.getElementById('race-status').innerText = "🏆 FINISHED!";

    sendTrackingToBackend({
        athlete: currentUser,
        event: eventId,
        finish_time: new Date(),
        distance: totalDistanceCovered
    });

    alert(`Congratulations! You finished ${event.title}`);
}

            // 3. SNAIL TRAIL (Red Line)
            userPathCoordinates.push(currentPos);
            if (trailPolyline) currentActiveMap.removeLayer(trailPolyline);
            trailPolyline = L.polyline(userPathCoordinates, { color: 'red', weight: 6, opacity: 0.9 }).addTo(currentActiveMap);

            // 4. STATS CALCULATION
          const now = Date.now();

if (lastLat !== null) {
    fetch(getAPIEndpoint("/api/live-metrics/"), {
        method: "POST",
      
      headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
},

        body: JSON.stringify({
            prevLat: lastLat,
            prevLng: lastLng,
            lat: lat,
            lng: lng,
            timeDiff: (now - lastTime) / 1000
        })
    })
 .then(data => {
    document.getElementById('live-speed').innerText = data.speed;

    totalDistanceCovered += data.distance;

    document.getElementById('live-dist').innerText =
        totalDistanceCovered.toFixed(2);

    if (true) {
        const timeInHours =
            (new Date() - raceStartTime) / 3600000;

        const avgSpeed =
            timeInHours > 0
                ? (totalDistanceCovered / timeInHours).toFixed(1)
                : "0.0";

        document.getElementById('avg-speed').innerText = avgSpeed;

        // ✅ STEP 5 ADD HERE
        sendTrackingToBackend({
            athlete: currentUser,
            event: eventId,
            speed: data.speed,
            avg_speed: avgSpeed,
            distance: totalDistanceCovered,
            lat,
            lng
        });
    }
});
 
}

lastLat = lat;
lastLng = lng;
lastTime = now;

        currentActiveMap.panTo(currentPos);

    }, (err) => console.error(err), { enableHighAccuracy: true });
}
function startLiveTimer() {
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(() => {
        if (!raceStartTime || raceFinished) return;
        const now = new Date();
        const diff = new Date(now - raceStartTime);
        const h = String(diff.getUTCHours()).padStart(2, '0');
        const m = String(diff.getUTCMinutes()).padStart(2, '0');
        const s = String(diff.getUTCSeconds()).padStart(2, '0');
        document.getElementById('live-timer').innerText = `${h}:${m}:${s}`;
    }, 1000);
}}
