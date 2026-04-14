const fallbackOrigin = typeof window !== "undefined" && window.location?.origin
  ? window.location.origin
  : "http://localhost:3000";

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

export const API_BASE_URL = env.VITE_API_URL || env.REACT_APP_API_URL || fallbackOrigin;
export const SOCKET_BASE_URL = env.VITE_SOCKET_URL || env.REACT_APP_SOCKET_URL || API_BASE_URL;
