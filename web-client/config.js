// Configuration
// Use the full URL to the backend server
const BACKEND_HOST = window.location.hostname; // Get current hostname
const BACKEND_PORT = 8000;
const API_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const BASE_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

// Export for modules that support it
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    API_URL,
    BASE_URL
  };
}