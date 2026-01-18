// client/src/config/api.ts

// ============================================
// DEVELOPMENT - Using Vite proxy (no CORS!)
// ============================================
const API_BASE_URL = '/api';  // Relative path - Vite proxies to localhost:3000

// ============================================
// PRODUCTION - Same origin (no CORS!)
// ============================================
// In production, it's the same - '/api' because Express serves both UI and API
// const API_BASE_URL = '/api';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);
console.log('Dev:', import.meta.env.DEV);
console.log('Prod:', import.meta.env.PROD);

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_CHECK: `${API_BASE_URL}/users/me`,
  LOGIN: `${API_BASE_URL}/users/login`,
  REGISTER: `${API_BASE_URL}/users/register`,
  FORGOT_PASSWORD: `${API_BASE_URL}/users/forgot-password`,
  RESET_PASSWORD: (token: string) => `${API_BASE_URL}/users/reset-password/${token}`,
  
  // Passenger endpoints
  PASSENGERS: `${API_BASE_URL}/passengers`,
  PASSENGER_BY_ID: (id: string) => `${API_BASE_URL}/passengers/${id}`,
  
  // User endpoints
  USERS: `${API_BASE_URL}/users`,
  USER_BY_ID: (id: string) => `${API_BASE_URL}/users/${id}`,
  UNVERIFIED_USERS: `${API_BASE_URL}/users/unverified`,
  VERIFY_USER: (id: string) => `${API_BASE_URL}/users/verify/${id}`,
  
  // Site endpoints
  SITES: `${API_BASE_URL}/sites`,
  SITE_POB: (siteName: string) => `${API_BASE_URL}/sites/${siteName}/pob`,
  INITIALIZE_SITES: `${API_BASE_URL}/sites/initialize`,
  
  // Trip endpoints
  TRIPS: `${API_BASE_URL}/trips`,
  TRIP_BY_ID: (id: string) => `${API_BASE_URL}/trips/${id}`,
};

// Helper function for API calls
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies if using sessions
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `HTTP error ${response.status}` 
    }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};

// Convenience methods
export const api = {
  get: (endpoint: string) => apiFetch(endpoint),
  post: (endpoint: string, data: any) => 
    apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint: string, data: any) => 
    apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint: string) => 
    apiFetch(endpoint, { method: 'DELETE' }),
};

export default API_BASE_URL;