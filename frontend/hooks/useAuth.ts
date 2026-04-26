import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import api from '@/lib/api';

export const useAuth = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, setSession, logout } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const localToken = localStorage.getItem('token');

      // Si no hay token y estamos en una ruta protegida -> redirigir a login
      if (!localToken) {
        if (pathname?.startsWith('/dashboard')) {
          console.warn("⚠️ [DEBUG] No hay token, pero la redirección a login está desactivada.");
          // router.push('/login');
        }
        setIsLoading(false);
        return;
      }

      // Si hay token pero no hay usuario en el store, intentamos cargar el perfil desde el Gateway
      if (!user) {
        try {
          // El Gateway valida el token y nos devuelve los datos del usuario + rol
          const res = await api.get('/auth/profile');
          const data = res.data.user;

          // Mapeamos el rol a minúsculas para consistencia en el Front
          const rawRole = data.app_metadata?.role || data.role || 'guest';
          const normalizedRole = rawRole.toLowerCase().includes('admin') ? 'admin' :
            rawRole.toLowerCase().includes('productor') ? 'productor' : 'tecnico';

          const userData = {
            id: data.id,                     // UUID de Supabase
            id_usuario: data.id_usuario || 0, // ID Numérico interno
            email: data.email,
            nombre: data.nombre || data.user_metadata?.nombre || 'Usuario',
            role: normalizedRole,
            nombre_predio: data.nombre_predio || '',
            numero_predial: data.numero_predial || ''
          };

          setSession(userData, localToken);

          if (pathname === '/login' || pathname === '/') {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error("⚠️ [DEBUG] Error validando sesión con el Gateway:", error);
          // handleLogout(); // Desactivado para depuración
        }
      } else {
        // Redirección si ya está autenticado e intenta ir a login
        if (pathname === '/login' || pathname === '/') {
          router.push('/dashboard');
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [pathname, router, user, setSession]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    router.push('/login');
  };

  return { user, token, isLoading, handleLogout };
};
