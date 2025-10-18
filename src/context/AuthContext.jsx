import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = async (username, password) => {
    await authApi.register({ username, password });
    navigate('/login');
  };

  const login = async (username, password) => {
    await authApi.login({ username, password });
    const res = await authApi.getMe();
    setUser(res.data);
    navigate('/me');
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
