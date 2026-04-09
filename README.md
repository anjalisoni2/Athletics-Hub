# Athletics Platform - HTML/CSS/JavaScript Version

This is a pure frontend implementation of the Next-Generation Athletics & Endurance Event Platform using vanilla HTML, CSS, and JavaScript (no frameworks).

## Project Structure

```
public/
├── index.html                          # Main HTML file
├── styles/
│   ├── main.css                        # Core styles and utilities
│   ├── components.css                  # Component-specific styles
│   └── responsive.css                  # Responsive design rules
├── scripts/
│   ├── data.js                         # Mock data
│   ├── utils.js                        # Utility functions
│   ├── app.js                          # Main application logic
│   └── views/
│       ├── landing.js                  # Landing page view
│       ├── events.js                   # Events discovery view
│       ├── event-details.js            # Event details view (to be created)
│       ├── athlete-dashboard.js        # Athlete dashboard (to be created)
│       ├── organizer-dashboard.js      # Organizer dashboard (to be created)
│       ├── admin-panel.js              # Admin panel (to be created)
│       └── live-tracking.js            # Live tracking view (to be created)
└── README.md                           # This file
```

## Features Implemented

✅ **Landing Page**
- Hero section with call-to-action
- Platform statistics
- Feature showcase
- User role cards (Athlete, Organizer, Admin)

✅ **Event Discovery**
- Event listing with cards
- Search functionality
- Category and status filters
- Responsive grid layout

✅ **Navigation System**
- Dynamic navigation based on user role
- Smooth view transitions
- Role-based access

## How to Run

### Option 1: Simple HTTP Server (Python)
```bash
cd public
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Node.js HTTP Server
```bash
cd public
npx http-server -p 8000
```
Then open `http://localhost:8000` in your browser.

### Option 3: PHP Built-in Server
```bash
cd public
php -S localhost:8000
```
Then open `http://localhost:8000` in your browser.

### Option 4: Just open the file
Simply open `public/index.html` directly in your browser (some features may not work due to CORS).

## Remaining Views to Implement

You need to create the following view files in `public/scripts/views/`:

### 1. event-details.js
```javascript
function renderEventDetails(container, eventId) {
    const event = mockEvents.find(e => e.id === eventId);
    if (!event) {
        container.innerHTML = '<div class="container py-8"><p>Event not found</p></div>';
        return;
    }
    
    // Render event details with tabs, registration form, etc.
    container.innerHTML = `
        <div class="container py-8">
            <button class="btn btn-ghost mb-6" onclick="navigateTo('events')">
                ${createIcon('arrowLeft').outerHTML}
                Back to Events
            </button>
            <h1>${event.title}</h1>
            <!-- Add full event details here -->
        </div>
    `;
}
```

### 2. athlete-dashboard.js
```javascript
function renderAthleteDashboard(container) {
    container.innerHTML = `
        <div class="container py-8">
            <h1>Athlete Dashboard</h1>
            <!-- Add dashboard stats, upcoming events, achievements, etc. -->
        </div>
    `;
}
```

### 3. organizer-dashboard.js
```javascript
function renderOrganizerDashboard(container) {
    container.innerHTML = `
        <div class="container py-8">
            <h1>Organizer Portal</h1>
            <!-- Add event management, participant tracking, etc. -->
        </div>
    `;
}
```

### 4. admin-panel.js
```javascript
function renderAdminPanel(container) {
    container.innerHTML = `
        <div class="container py-8">
            <h1>Admin Panel</h1>
            <!-- Add user management, event approvals, system monitoring, etc. -->
        </div>
    `;
}
```

### 5. live-tracking.js
```javascript
function renderLiveTracking(container) {
    container.innerHTML = `
        <div class="container py-8">
            <h1>Live Race Tracking</h1>
            <!-- Add live leaderboard, runner positions, checkpoints, etc. -->
        </div>
    `;
}
```

## Key JavaScript Functions

### Navigation
```javascript
navigateTo(view, eventId)  // Navigate to a different view
login(role)                // Login as athlete, organizer, or admin
logout()                   // Logout and return to landing page
```

### Utilities
```javascript
createIcon(name)           // Create SVG icon
formatDate(dateString)     // Format date to readable string
getStatusBadgeClass(status) // Get badge class for status
```

## Customization

### Colors
Edit CSS variables in `styles/main.css`:
```css
:root {
    --primary-blue: #2563eb;
    --primary-purple: #9333ea;
    --success-green: #10b981;
    /* ... */
}
```

### Mock Data
Edit `scripts/data.js` to add/modify:
- Events
- Athletes
- Race results
- Live runner data

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## No Backend Required

This is a pure frontend application. All data is stored in JavaScript and simulated. Perfect for:
- Prototyping
- UI/UX demonstration
- Learning vanilla JavaScript
- Portfolio projects

## Next Steps

1. Complete the remaining view files
2. Add form validation
3. Implement local storage for data persistence
4. Add more interactive features
5. Optimize for mobile devices

## Python Backend (Optional)

If you want to add a Python backend later:

```python
# server.py
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=8000)
```

Run with:
```bash
pip install flask
python server.py
```

## License

This is a demonstration project for educational purposes.
