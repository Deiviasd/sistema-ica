import { create } from 'zustand';

interface User {
  id: string;
  id_usuario?: number;
  email: string;
  nombre: string;
  role: string;
  documento?: string;
  identificacion?: string;
  numero_documento?: string;
  telefono?: string;
  nombre_predio?: string;
  numero_predial?: string;
  foto_perfil?: string;
}

interface UserStore {
  user: User | null;
  token: string | null;
  selectedPredioId: string | null;
  setSelectedPredioId: (id: string | null) => void;
  setSession: (user: User, token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: null,
  selectedPredioId: null,
  setSelectedPredioId: (id) => set({ selectedPredioId: id }),
  setSession: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null, selectedPredioId: null }),
}));
