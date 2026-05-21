import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as apiLogin, register as apiRegister, getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const access = localStorage.getItem('access');
    if (!access) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUser(data);
    } catch {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (telephone, password) => {
    const { data } = await apiLogin(telephone, password);
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    jwtDecode(data.access); // valide le token
    const { data: me } = await getMe();
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    await apiRegister(payload);
    return login(payload.telephone, payload.password);
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await getMe();
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
