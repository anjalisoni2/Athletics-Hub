// API Configuration - Centralized backend URL management

// Determine the API base URL based on environment
export function getAPIBaseURL() {
  const deployedBackend = 'https://athletics-hub.onrender.com';
  const localBackend = 'http://127.0.0.1:8000';

  const hostname = window.location.hostname;

  // Use local backend for development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return localBackend;
  }

  // Use deployed backend for production (including Vercel or any other host)
  return deployedBackend;
}

// Helper function to build API endpoints
export function getAPIEndpoint(path) {
  return `${getAPIBaseURL()}${path}`;
}
