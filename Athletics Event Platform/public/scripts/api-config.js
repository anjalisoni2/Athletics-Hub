// API Configuration - Centralized backend URL management

// Determine the API base URL based on environment
export function getAPIBaseURL() {
  const deployedBackend = 'https://athleticseventbackend-production.up.railway.app';
  const localBackend = 'http://127.0.0.1:8000';
  
  // Get the hostname from the current page
  const hostname = window.location.hostname;
  
  // Auto-detect environment
  // If we are on localhost or 127.0.0.1, use the local backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return localBackend;
  }
  
  // If we are opening the file directly (file:// protocol) or any other host,
  // use the local backend for development - the deployed backend may not be available
  return localBackend;
}

// Helper function to build API endpoints
export function getAPIEndpoint(path) {
  return `${getAPIBaseURL()}${path}`;
}
