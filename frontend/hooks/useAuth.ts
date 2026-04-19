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
      
      // Si no hay token y estamos en una ruta protegida -> a login
      if (!localToken) {
        if (pathname?.startsWith('/dashboard')) {
          router.push('/login');
        }
        setIsLoading(false);
        return;
      }

      // Si hay token pero no hay usuario en el store, intentamos cargar perfil
      if (!user) {
        try {
          // Validamos el token contra nuestro Gateway
          const res = await api.get('/auth/profile');
          const userData = {
            id: res.data.user.id,
            email: res.data.user.email,
            role: res.data.user.app_metadata?.role || 'guest'
          };
          setSession(userData, localToken);
          
          if (pathname === '/login' || pathname === '/') {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error("Error validando sesión:", error);
          handleLogout();
        }
      } else {
        // Si ya tenemos sesión y estamos en login, saltamos al dashboard
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
