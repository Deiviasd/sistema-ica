import axios from 'axios';


const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para inyectar token automáticamente en cada petición
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar tokens caducados
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("⚠️ [DEBUG] Error 401 detectado, pero la expulsión está desactivada.");
            /*
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                useUserStore.getState().logout();
                window.location.href = '/login';
            }
            */
        }
        return Promise.reject(error);
    }
);

export default api;