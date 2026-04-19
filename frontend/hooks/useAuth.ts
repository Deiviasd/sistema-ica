import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

export const useAuth = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, setSession, logout } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const initializeAuth = async () => {
      // Pedimos la sesión actual directamente a Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // En Supabase el token es safe
        const accessToken = session.access_token;
        const authUser = session.user;
        
        // Vamos a la tabla tuya 'usuario' para traer el rol correcto.
        const { data: profile } = await supabase
          .from('usuario')
          .select('id_rol')
          .eq('correo', authUser.email)
          .single();

        let role = 'guest';
        if (profile) {
           role = profile.id_rol === 'ADMIN_ICA' ? 'admin' : 
                  profile.id_rol === 'PRODUCTOR' ? 'productor' : 'tecnico';
        }

        const userData = {
          id: authUser.id,
          email: authUser.email || '',
          role: role
        };

        // Guardamos para que el interceptor de Axios también lo pueda usar
        localStorage.setItem('token', accessToken);
        setSession(userData, accessToken);
        
        if (pathname === '/login' || pathname === '/') {
          router.push('/dashboard');
        }
      } else {
        // Redirigir a login si intenta ir a rutas protegidas sin sesión
        if (pathname?.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Suscribirse a cambios si cierra sesión en otra pestaña
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
         if (event === 'SIGNED_OUT') {
           handleLogout();
         }
      }
    );

    return () => {
      subscription.unsubscribe();
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    logout();
    router.push('/login');
  };

  return { user, token, isLoading, handleLogout };
};
