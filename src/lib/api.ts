const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

// Logger utility for frontend
const logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️ ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`, error || '');
  },
  
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️ ${message}`, data || '');
  },
  
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] 🔍 ${message}`, data || '');
  }
};

// API helper with logging
async function apiCall(
  endpoint: string, 
  options: RequestInit = {},
  logLabel: string = ''
) {
  const url = `${API_URL}${endpoint}`;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] 📤 ${logLabel || 'API Call'}: ${options.method || 'GET'} ${endpoint}`);
  if (options.body) {
    console.log(`[${timestamp}] 📤 Body:`, JSON.parse(options.body as string));
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    const data = await res.json();
    
    console.log(`[${timestamp}] 📥 Response (${res.status}):`, data);
    
    if (!res.ok) {
      logger.error(`API Error: ${endpoint}`, data);
    }
    
    return { data, status: res.ok, statusCode: res.status };
  } catch (error: any) {
    logger.error(`Network Error: ${endpoint}`, error);
    throw error;
  }
}

export { API_URL, logger, apiCall };

// Convenience API object with auth token
const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Lỗi API");
    return data;
  },
  post: async (endpoint: string, body: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Lỗi API");
    return data;
  },
  put: async (endpoint: string, body: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Lỗi API");
    return data;
  },
  delete: async (endpoint: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Lỗi API");
    return data;
  },
};

export { api };
