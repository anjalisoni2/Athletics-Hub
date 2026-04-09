// live-tracking.js

// Safety check: Ensure Leaflet is loaded
if (typeof L === "undefined") {
    console.error("Leaflet library not loaded! Make sure leaflet.js is included before this script.");
}

import { createIcon, switchTab } from "../utils.js";
import { mockLiveRunners, mockRaceResults, mockEvents } from "../data.js";
import { createResultsTracker } from "../results-tracking.js";
import { getAPIEndpoint } from "../api-config.js";


// import { createIcon, switchTab } from "../utils.js";
// import { mockLiveRunners, mockRaceResults } from "../data.js";

export function renderLiveTracking(container) {
    let searchBib = "";
    let currentTime = new Date();
    let mapInstance = null;
    let runnerMarkers = {};
    let runnerPolylines = {};
    let socket = null;
    const raceStartTime = new Date(); // Track when the race started
    const resultsTracker = createResultsTracker('current-event', 100); // 100km max distance

    // Make results tracker globally accessible
    window.resultsTracker = resultsTracker;

    // Initialize dynamic runners with starting data
    let liveRunners = mockLiveRunners.map(runner => ({
        ...runner,
        distance: 38.5 - (mockLiveRunners.indexOf(runner) * 0.3),
        lastUpdateTime: currentTime.getTime(),
        lat: 23.0225 + (Math.random() * 0.01),
        lng: 72.5714 + (Math.random() * 0.01),
        routeHistory: [[23.0225 + (Math.random() * 0.01), 72.5714 + (Math.random() * 0.01)]],
        finished: false,
        finishTime: null
    }));

    // ⏱️ Update time every second and runner positions every 5 seconds
    const timeInterval = setInterval(() => {
        currentTime = new Date();
        document.querySelectorAll(".live-time").forEach(el => {
            el.textContent = currentTime.toLocaleTimeString();
        });
    }, 1000);

    // Update runner positions dynamically every 5 seconds
    const updateInterval = setInterval(() => {
        liveRunners = liveRunners.map(runner => {
            // Simulate runner movement towards finish (100km)
            const maxDistance = 100;
            const increment = Math.random() * 0.15 + 0.08; // 0.08-0.23 km per update
            const newDistance = Math.min(runner.distance + increment, maxDistance);

            // Calculate updated pace (varies slightly)
            const paceVariation = (Math.random() - 0.5) * 0.1;
            const basePace = 4.25;
            const newPaceValue = basePace + paceVariation;
            const minutes = Math.floor(newPaceValue);
            const seconds = Math.round((newPaceValue % 1) * 60);
            const newPace = `${minutes}:${seconds.toString().padStart(2, '0')}/km`;

            // Calculate estimated finish time
            const remainingDistance = maxDistance - newDistance;
            const paceInMinutes = minutes + (seconds / 60);
            const minutesRemaining = remainingDistance * paceInMinutes;
            const finishTimeObj = new Date(currentTime.getTime() + minutesRemaining * 60000);
            const newEstimatedFinish = finishTimeObj.toLocaleTimeString().slice(0, 5);

            return {
                ...runner,
                distance: parseFloat(newDistance.toFixed(1)),
                pace: newPace,
                estimatedFinish: newEstimatedFinish,
                lastUpdateTime: currentTime.getTime()
            };
        });

        // Re-sort runners by position
        liveRunners.sort((a, b) => b.distance - a.distance);
        liveRunners = liveRunners.map((runner, idx) => ({
            ...runner,
            currentPosition: idx + 1
        }));

    
    }, 5000);

    function initializeMap() {
        // Check if Leaflet is loaded
        if (typeof L === "undefined") {     
            console.error("❌ Leaflet library not loaded! Cannot initialize map.");
            return;
        }

        console.log('✓ Leaflet library loaded successfully');

        // Check if map container exists
        const mapContainer = document.getElementById('leaflet-map');
        if (!mapContainer) {
            console.error("❌ Map container #leaflet-map not found in DOM!");
            return;
        }

        if (mapInstance) {
            console.log('⚠️ Map already initialized');
            return;
        }

        console.log('🗺️ Initializing Leaflet map...');

        // Initialize Leaflet map (Ahmedabad coordinates)
        const startLat = 23.0225;
        const startLng = 72.5714;

        try {
            mapInstance = L.map('leaflet-map').setView([startLat, startLng], 14);
            window.leafletMapInstance = mapInstance;
            console.log('✓ Map instance created');
        } catch (err) {
            console.error('❌ Failed to create map instance:', err);
            return;
        }

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        console.log('✓ Map tiles loaded');

        // Add start line marker
        const startMarker = L.marker([startLat, startLng], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI0IiBmaWxsPSIjNjY2NjY2Ii8+PHRleHQgeD0iMTYiIHk9IjIyIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPlM8L3RleHQ+PC9zdmc+',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        }).addTo(mapInstance).bindPopup('Start Line');

        // Add finish line marker
        const finishLat = 23.0300;
        const finishLng = 72.5800;
        const finishMarker = L.marker([finishLat, finishLng], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI0IiBmaWxsPSIjREM0NDQzIi8+PHRleHQgeD0iMTYiIHk9IjIyIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPkY8L3RleHQ+PC9zdmc+',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        }).addTo(mapInstance).bindPopup('Finish Line');

        // Store checkpoint coordinates
        const checkpoints = [
            { lat: 23.0250, lng: 72.5750, name: 'Checkpoint 1 (10km)', color: '#16a34a' },
            { lat: 23.0275, lng: 72.5775, name: 'Checkpoint 2 (25km)', color: '#16a34a' },
            { lat: 23.0280, lng: 72.5800, name: 'Checkpoint 3 (38km)', color: '#16a34a' }
        ];

        // Add checkpoint markers
        checkpoints.forEach(checkpoint => {
            L.circleMarker([checkpoint.lat, checkpoint.lng], {
                radius: 8,
                fillColor: checkpoint.color,
                color: checkpoint.color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            }).addTo(mapInstance).bindPopup(checkpoint.name);
        });

        // Initialize runner markers and polylines
        console.log(`📍 Initializing ${liveRunners.length} runner markers...`);

        liveRunners.forEach((runner, idx) => {
            const iconColor = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 4];

            runnerMarkers[runner.bibNumber] = L.marker([runner.lat, runner.lng], {
                icon: L.icon({
                    iconUrl: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0iJHtpY29uQ29sb3J9Ii8+PHRleHQgeD0iMTYiIHk9IjIyIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPkIke3J1bm5lci5iaWJOdW1iZXJ9PC90ZXh0Pjwvc3ZnPg==`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(mapInstance).bindPopup(`${runner.name} (Bib: ${runner.bibNumber})`);

            runnerPolylines[runner.bibNumber] = L.polyline(runner.routeHistory, {
                color: iconColor,
                weight: 3,
                opacity: 0.7
            }).addTo(mapInstance);

            console.log(`  ✓ Marker created for Bib ${runner.bibNumber}`);
        });

        console.log('✓ All runner markers initialized');

        // Try to connect to Socket.IO server with comprehensive error handling
        if (typeof io !== "undefined") {
            try {
                console.log('📡 Attempting to connect to Socket.IO server at http://localhost:5000...');

                socket = io('http://localhost:5000', {
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 10,
                    transports: ['websocket', 'polling'],
                    timeout: 10000,
                    forceNew: true
                });

                socket.on('connect', () => {
                    console.log('✅ SUCCESS! Connected to Socket.IO server');
                    console.log('   Socket ID:', socket.id);
                });

                socket.on('runner_location', (data) => {
                    if (!data || !data.bibNumber) {
                        console.warn('⚠️ Invalid runner data received:', data);
                        return;
                    }
                    console.log('📍 Runner location update:', data.bibNumber);
                    updateRunnerLocation(data);
                });

                socket.on('disconnect', () => {
                    console.log('⚠️ Disconnected from Socket.IO server - using mock data only');
                });

                socket.on('connect_error', (error) => {
                    console.error('❌ Socket.IO connection error:', error);
                    console.log('   Make sure socket_server.py is running on port 5000');
                    console.log('   Run: python socket_server.py');
                });

                socket.on('error', (error) => {
                    console.error('❌ Socket.IO error:', error);
                });
            } catch (err) {
                console.error('❌ Error initializing Socket.IO:', err.message);
                console.log('Falling back to mock data only');
                socket = null;
            }
        } else {
            console.warn('⚠️ Socket.IO library not loaded - make sure socket.io.min.js is in index.html');
            socket = null;
        }
// ================= USER LIVE LOCATION (FAST + FALLBACK) =================
console.log("📡 Starting location detection...");

function showUserLocation(lat, lng, label = "📍 You are here") {
    const userLatLng = [lat, lng];

    console.log("📍 LOCATION:", lat, lng, label);

    if (!window.userLocationMarker) {
        window.userLocationMarker = L.marker(userLatLng, {
            icon: L.icon({
                iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            })
        })
        .addTo(mapInstance)
        .bindPopup(label)
        .openPopup();

        mapInstance.setView(userLatLng, 15);
    } else {
        window.userLocationMarker.setLatLng(userLatLng);
    }
}

if (navigator.geolocation) {

    // ⭐ FAST attempt (WiFi/IP based, no GPS wait)
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            showUserLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
            console.warn("⚠️ GPS fast attempt failed → using fallback", err.message);

            // ⭐ FALLBACK using IP location (ALWAYS WORKS)
            fetch("https://ipapi.co/json/")
                .then(res => res.json())
                .then(data => {
                    if (data && data.latitude) {
                        showUserLocation(
                            data.latitude,
                            data.longitude,
                            "📍 Approx location (IP based)"
                        );
                    } else {
                        console.error("❌ IP location also failed");
                    }
                })
                .catch(() => console.error("❌ Cannot reach IP location service"));
        },
        {
            enableHighAccuracy: false,   // ⭐ FAST mode
            timeout: 10000,
            maximumAge: 60000
        }
    );

} else {
    console.error("❌ Geolocation not supported");
}


    }

    function updateRunnerLocation(data) {
        if (!mapInstance || !data.bibNumber) {
            console.warn('⚠️ Cannot update location - missing map instance or bibNumber');
            return;
        }

        const bibNumber = String(data.bibNumber);
        const newLat = data.lat;
        const newLng = data.lng;
        const newLatLng = [newLat, newLng];

        // Find or create runner entry
        let runner = liveRunners.find(r => String(r.bibNumber) === bibNumber);

        if (!runner) {
            console.log(`📍 Creating new runner marker for Bib ${bibNumber}`);
            // Create new runner entry if it doesn't exist
            runner = {
                bibNumber: bibNumber,
                name: data.name || `Runner ${bibNumber}`,
                distance: 0,
                pace: '0:00/km',
                estimatedFinish: '00:00',
                lat: newLat,
                lng: newLng,
                routeHistory: [[newLat, newLng]],
                lastUpdateTime: currentTime.getTime(),
                currentPosition: liveRunners.length + 1
            };
            liveRunners.push(runner);
        } else {
            // Update existing runner
            runner.lat = newLat;
            runner.lng = newLng;
            if (!runner.routeHistory) runner.routeHistory = [];
        }

        // Create marker if it doesn't exist
        if (!runnerMarkers[bibNumber]) {
            const iconColor = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][liveRunners.indexOf(runner) % 4];

            runnerMarkers[bibNumber] = L.marker([newLat, newLng], {
                icon: L.icon({
                    iconUrl: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0iJHtpY29uQ29sb3J9Ii8+PHRleHQgeD0iMTYiIHk9IjIyIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC13ZWlnaHQ9ImJvbGQiPkIke2JpYk51bWJlcn08L3RleHQ+PC9zdmc+`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(mapInstance).bindPopup(`${runner.name} (Bib: ${bibNumber})`);

            console.log(`✓ Created marker for Bib ${bibNumber}`);
        }

        // Update marker position
        runnerMarkers[bibNumber].setLatLng(newLatLng);

        // Create polyline if it doesn't exist
        if (!runnerPolylines[bibNumber]) {
            const iconColor = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][liveRunners.indexOf(runner) % 4];
            runnerPolylines[bibNumber] = L.polyline([newLatLng], {
                color: iconColor,
                weight: 3,
                opacity: 0.7
            }).addTo(mapInstance);
        }

        // Add to polyline route
        if (!runner.routeHistory) runner.routeHistory = [];
        runner.routeHistory.push(newLatLng);
        runnerPolylines[bibNumber].setLatLngs(runner.routeHistory);

        // Check if runner finished
        const finishLat = 23.0300;
        const finishLng = 72.5800;
        const distance = mapInstance.distance(newLatLng, [finishLat, finishLng]);

        if (distance < 50 && !runner.finished) {
            runner.finished = true;

            // Calculate elapsed time since race started
            const elapsedSeconds = Math.floor((new Date() - raceStartTime) / 1000);
            runner.finishTime = elapsedSeconds;

            // Record finish in results tracker
            resultsTracker.recordFinish(runner, elapsedSeconds);

            // Update marker popup
            const finishTimeDisplay = resultsTracker.getLeaderboard().find(r => String(r.bibNumber) === bibNumber)?.finishTime || '00:00:00';
            const rank = resultsTracker.getRunnerRank(bibNumber);
            runnerMarkers[bibNumber].setPopupContent(`${runner.name} - 🏁 Finished! #${rank} (${finishTimeDisplay})`);

            console.log(`🏁 Runner ${bibNumber} finished! Time: ${finishTimeDisplay}, Rank: ${rank}`);
        }
    }

    function renderContent() {
        const filteredRunners = searchBib
            ? liveRunners.filter(runner =>
                runner.bibNumber.toLowerCase().includes(searchBib.toLowerCase()) ||
                runner.name.toLowerCase().includes(searchBib.toLowerCase())
            )
            : liveRunners;

        container.innerHTML = `
            <div class="bg-gray-50" style="min-height: 100vh; padding: 2rem 0;">
                <div class="container">
                    <!-- Header -->
                <div class="mb-8">
                    <div class="flex items-center gap-3 mb-2">
                        <div style="width: 40px; height: 40px; color: var(--danger-red);">
                            <div class="animate-pulse">${createIcon('radio').outerHTML}</div>
                        </div>
                        <div style="flex: 1;">
                            <h1 class="text-4xl font-bold">Live Race Tracking</h1>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="badge badge-live">LIVE</span>
                                <span class="text-gray-600">Urban Cycling Grand Prix</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="navigateTo('results-leaderboard')">
                            ${createIcon('medal').outerHTML}
                            Full Results
                        </button>
                    </div>
                    <p class="text-xl text-gray-600">Real-time participant tracking and race updates</p>
                </div>

                    <!-- Race Info Bar -->
                    <div class="cta-section py-6 mb-8 rounded-lg">
                        <div class="grid grid-md-4 gap-6 text-white text-center">
                            <div>
                                ${createIcon('clock').outerHTML}
                                <p class="text-sm" style="opacity: 0.9; margin-top: 0.5rem;">Race Time</p>
                                <p class="text-2xl font-bold live-time">${currentTime.toLocaleTimeString()}</p>
                            </div>
                            <div>
                                ${createIcon('users').outerHTML}
                                <p class="text-sm" style="opacity: 0.9; margin-top: 0.5rem;">Active Runners</p>
                                <p class="text-2xl font-bold">${liveRunners.length}</p>
                            </div>
                            <div>
                                ${createIcon('activity').outerHTML}
                                <p class="text-sm" style="opacity: 0.9; margin-top: 0.5rem;">Finished</p>
                                <p class="text-2xl font-bold">${resultsTracker.getLeaderboard().length}</p>
                            </div>
                            <div>
                                ${createIcon('mapPin').outerHTML}
                                <p class="text-sm" style="opacity: 0.9; margin-top: 0.5rem;">Leader Distance</p>
                                <p class="text-2xl font-bold">${liveRunners[0]?.distance.toFixed(1) || '0'} km</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="tabs" id="trackingTabs">
                        <div class="tabs-list">
                            <button class="tab-trigger active" data-tab="live" onclick="switchTab('trackingTabs', 'live')">Live Positions</button>
                            <button class="tab-trigger" data-tab="results" onclick="switchTab('trackingTabs', 'results')">Results</button>
                            <button class="tab-trigger" data-tab="map" onclick="switchTab('trackingTabs', 'map')">Track Map</button>
                        </div>

                        <!-- Live Positions Tab -->
                        <div class="tab-content active" id="live">
                            <!-- Search -->
                            <div class="card mb-6">
                                <div class="card-content">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <div class="card-title">Track a Runner</div>
                                            <div class="card-description">Search by bib number or name</div>
                                        </div>
                                        <div class="search-container" style="width: 256px;">
                                            <div class="search-icon">${createIcon('search').outerHTML}</div>
                                            <input type="text" id="searchBib" class="search-input" placeholder="Search bib number..." value="${searchBib}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Live Leaderboard -->
                            <div class="card mb-6">
                                <div class="card-header">
                                    <div class="card-title flex items-center gap-2">
                                        ${createIcon('trophy').outerHTML}
                                        Current Top Positions
                                    </div>
                                    <div class="card-description">Live leaderboard updates every 30 seconds</div>
                                </div>
                                <div class="card-content">
                                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                        ${filteredRunners.map((runner, idx) => {
                                            const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other';
                                            const positionClass = idx === 0 ? 'position-1' : idx === 1 ? 'position-2' : idx === 2 ? 'position-3' : 'position-other';
                                            return `
                                                <div class="leaderboard-item ${rankClass}">
                                                    <div class="flex items-center justify-between">
                                                        <div class="flex items-center gap-4">
                                                            <div class="position-badge ${positionClass}">
                                                                ${runner.currentPosition}
                                                            </div>
                                                            <div>
                                                                <h4 class="font-bold text-lg">${runner.name}</h4>
                                                                <div class="flex items-center gap-3 text-sm text-gray-600">
                                                                    <span class="badge badge-outline">Bib ${runner.bibNumber}</span>
                                                                    <span class="flex items-center gap-1">
                                                                        ${createIcon('mapPin').outerHTML}
                                                                        ${runner.distance} km
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="flex items-center gap-2 mb-1">
                                                                ${createIcon('zap').outerHTML}
                                                                <span class="font-semibold">${runner.pace}</span>
                                                            </div>
                                                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                                                ${createIcon('clock').outerHTML}
                                                                <span>ETA: ${runner.estimatedFinish}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                        
                                        ${filteredRunners.length === 0 ? `
                                            <div class="text-center py-8">
                                                <p class="text-gray-500">No runners found</p>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>


                        </div>

                        <!-- Results Tab -->
                        <div class="tab-content" id="results">
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title flex items-center gap-2">
                                        ${createIcon('medal').outerHTML}
                                        Live Race Results
                                    </div>
                                    <div class="card-description">Real-time leaderboard from live tracking data</div>
                                </div>
                                <div class="card-content">
                                    ${(() => {
                                        const leaderboard = resultsTracker.getLeaderboard();
                                        if (leaderboard.length === 0) {
                                            return `<div class="text-center py-8"><p class="text-gray-500">No finishers yet. Race in progress...</p></div>`;
                                        }

                                        return `<div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                            ${leaderboard.map(result => {
                                                const positionClass = result.rank === 1 ? 'position-1' :
                                                                    result.rank === 2 ? 'position-2' :
                                                                    result.rank === 3 ? 'position-3' : 'position-other';
                                                return `
                                                    <div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                                        <div class="flex items-center gap-4">
                                                            <div class="position-badge ${positionClass}" style="width: 2.5rem; height: 2.5rem; font-size: 1.125rem;">
                                                                ${result.rank}
                                                            </div>
                                                            <div>
                                                                <h4 class="font-semibold">${result.name}</h4>
                                                                <div class="flex items-center gap-2 text-sm text-gray-600">
                                                                    <span class="badge badge-outline">Bib ${result.bibNumber}</span>
                                                                    <span class="flex items-center gap-1">
                                                                        ${createIcon('mapPin').outerHTML}
                                                                        ${(result.distance || 100).toFixed(1)} km
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="text-right">
                                                            <p class="text-xl font-bold" style="color: var(--primary-blue);">${result.finishTime}</p>
                                                            <p class="text-sm text-gray-600">${result.pace}</p>
                                                        </div>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>`;
                                    })()}
                                    <div class="mt-6 text-center">
                                        <button class="btn btn-outline" onclick="alert('${resultsTracker.exportAsCSV().replace(/"/g, '\\"')}')">Export Results (CSV)</button>
                                    </div>
                                </div>
                            </div>
                        </div>
<!-- Map Tab -->
<div class="tab-content" id="map">
    <div class="card mb-6">
        <div class="card-header">
            <div class="card-title flex items-center gap-2">
                ${createIcon('navigation').outerHTML}
                Race Track Map
            </div>
            <div class="card-description">
                Event route map with start and finish locations
            </div>
        </div>

        <div class="card-content">

<div style="margin-bottom:20px;background:white;padding:15px;border-radius:10px;border:1px solid #ddd;">
    <label style="display:block;font-weight:bold;margin-bottom:8px;">
        Select Your Event:
    </label>

    <select id="eventSelector"
        style="width:100%;padding:12px;border-radius:8px;border:2px solid #2563eb;font-size:1rem;">
    </select>
</div>



            <!-- Event Route Map -->
            <div style="height:500px;width:100%;border-radius:10px;overflow:hidden;">
                <div id="route-map" style="height:100%;width:100%;"></div>
            </div>

            <!-- Map Legend -->
            <div style="margin-top:1rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius);">
                <p class="text-sm font-semibold mb-3">Map Legend</p>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;">
                    <div class="flex items-center gap-2">
                        <div style="width:1rem;height:1rem;background:#22c55e;border-radius:50%;"></div>
                        <span class="text-sm">Start Location</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <div style="width:1rem;height:1rem;background:#ef4444;border-radius:50%;"></div>
                        <span class="text-sm">Finish Location</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <div style="width:1rem;height:1rem;background:#2563eb;border-radius:50%;"></div>
                        <span class="text-sm">Route Line</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>


                            <!-- Checkpoints -->
                            <div class="card">
                                <div class="card-header">
                                    <div class="card-title">Checkpoint Status</div>
                                </div>
                                <div class="card-content">
                                    <div class="grid grid-md-2 grid-lg-4 gap-4">
                                        ${[
                                            { name: 'Start Line', distance: '0 km', passed: 1523, status: 'complete' },
                                            { name: 'Checkpoint 1', distance: '10 km', passed: 1523, status: 'complete' },
                                            { name: 'Checkpoint 2', distance: '25 km', passed: 1498, status: 'active' },
                                            { name: 'Checkpoint 3', distance: '38 km', passed: 892, status: 'active' },
                                            { name: 'Checkpoint 4', distance: '50 km', passed: 234, status: 'active' },
                                            { name: 'Water Station 1', distance: '5 km', passed: 1523, status: 'complete' },
                                            { name: 'Water Station 2', distance: '15 km', passed: 1521, status: 'complete' },
                                            { name: 'Finish Line', distance: '100 km', passed: 0, status: 'waiting' }
                                        ].map(checkpoint => `
                                            <div class="checkpoint-card">
                                                <div class="checkpoint-status">
                                                    <h4 class="checkpoint-name">${checkpoint.name}</h4>
                                                    <span class="badge ${
                                                        checkpoint.status === 'complete' ? 'badge-success' :
                                                        checkpoint.status === 'active' ? 'badge-primary' :
                                                        'badge-outline'
                                                    }">${checkpoint.status}</span>
                                                </div>
                                                <p class="text-sm text-gray-600">${checkpoint.distance}</p>
                                                <p class="text-sm font-medium mt-1">${checkpoint.passed} runners passed</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        `;

        // 🔎 Search handler
        const searchInput = document.getElementById("searchBib");
        if (searchInput) {
            searchInput.oninput = e => {
                searchBib = e.target.value;
                renderContent();
            };
        }
    }

    renderContent();

    // Initialize map after content is rendered with proper DOM readiness check
    let mapUpdateInterval = null;

const initializeMapWithDelay = () => {
    const mapContainer = document.getElementById('leaflet-map');

    if (!mapContainer) {
        console.log('⏳ Waiting for map container to load...');
        setTimeout(initializeMapWithDelay, 100);
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet not available");
        return;
    }

    console.log('🚀 Starting map initialization...');
    initializeMap();

    if (!mapInstance) {
        console.error('Map initialization failed');
        return;
    }

    console.log('Map initialized');

    mapUpdateInterval = setInterval(() => {
        if (!mapInstance) return;
        if (socket && socket.connected) return;

        liveRunners.forEach(runner => {
            const finishLat = 23.0300;
            const finishLng = 72.5800;

            const latDelta = (finishLat - runner.lat) * 0.02;
            const lngDelta = (finishLng - runner.lng) * 0.02;

            runner.lat += latDelta + (Math.random() - 0.5) * 0.001;
            runner.lng += lngDelta + (Math.random() - 0.5) * 0.001;

            updateRunnerLocation({
                bibNumber: runner.bibNumber,
                lat: runner.lat,
                lng: runner.lng
            });
        });
    }, 3000);
};

// ✅ Move outside function
window.initializeLiveTrackingMap = initializeMapWithDelay;


 // Initialize map ONLY when user opens MAP tab
// document.addEventListener("click", (e) => {
//     if (e.target.matches('[data-tab="map"]')) {
//         setTimeout(() => {
//             console.log("📍 Map tab opened → initializing map...");
//             initializeMapWithDelay();
//         }, 200);
//     }
// });



// Initialize EVENT ROUTE map ONLY when MAP tab opens

document.addEventListener("click", async (e) => {
    if (e.target.matches('[data-tab="map"]')) {

        const selector = document.getElementById("eventSelector");
        if (!selector) return;

        const events = await loadOrganizerEvents();

        selector.innerHTML = "";

        events.forEach(ev => {
            const option = document.createElement("option");
            option.value = ev.location;
            option.textContent =
                `${ev.title} (${ev.location})`;

            selector.appendChild(option);
        });

        // default map load
        if (events.length > 0) {
            initializeRouteMap(events[0]);
        }

        selector.onchange = () => {
            const selectedEvent =
                events[selector.selectedIndex];
            initializeRouteMap(selectedEvent);
        };
    }
});



// If map already exists → just resize
if (window.leafletMapInstance) {
    window.leafletMapInstance.invalidateSize();
    return;
}


    // Log summary
    console.log('\n' + '='.repeat(70));
    console.log('🏃 LIVE TRACKING MAP READY');
    console.log('='.repeat(70));
    console.log('');
    console.log('📍 Map Status:');
    console.log('   • Leaflet map: Ready');
    console.log('   • Socket.IO: Attempting connection to http://localhost:5000');
    console.log('   • Fallback mode: Mock data available');
    console.log('');
    console.log('🔍 To enable real-time updates:');
    console.log('   1. Run: python socket_server.py');
    console.log('   2. Check console for "✅ SUCCESS! Connected"');
    console.log('');
    console.log('ℹ️  Open browser DevTools (F12) for connection details');
    console.log('='.repeat(70) + '\n');

    // Cleanup on page unload (SAFE - no focus/reload)
    window.addEventListener("beforeunload", () => {
        if (mapUpdateInterval) clearInterval(mapUpdateInterval);
        if (socket) socket.disconnect();
        clearInterval(timeInterval);
        clearInterval(updateInterval);
    });
    
}



async function initializeRouteMap(event) {
    const mapElement = document.getElementById("route-map");
    if (!mapElement) return;

    if (!window.google || !window.google.maps) {
        console.error("Google Maps not loaded");
        return;
    }

    const parts = event.location.split(" to ");
    const start = parts[0];
    const end = parts[1] || parts[0];

    async function getCoords(place) {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`
        );
        const data = await res.json();
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    }

    const startPos = await getCoords(start);
    const endPos = await getCoords(end);

    const map = new google.maps.Map(mapElement, {
        zoom: 12,
        center: startPos
    });

    new google.maps.Marker({
        position: startPos,
        map,
        title: "Start",
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    });

    new google.maps.Marker({
        position: endPos,
        map,
        title: "End",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
    });
}



async function loadOrganizerEvents() {
    const currentUser = localStorage.getItem("currentUser");

    const res = await fetch(getAPIEndpoint("/api/approved-events/"));
    if (!res.ok) return [];

    const events = await res.json();

    // sirf organizer ke events
    return events.filter(ev => ev.organizer === currentUser);
}
