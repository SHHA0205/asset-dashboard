import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getToken,
  isLocalOnly,
  login as apiLogin,
  register as apiRegister,
  setLocalOnly,
  setToken,
} from '../api/auth';

interface User {
  id: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLocalOnly: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  useLocalOnly: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [localOnly, setLocalOnlyMode] = useState(isLocalOnly());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.userId, username: payload.username });
      } catch {
        setToken(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    setToken(result.token);
    setUser(result.user);
    setLocalOnly(false);
    setLocalOnlyMode(false);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const result = await apiRegister(username, password);
    setToken(result.token);
    setUser(result.user);
    setLocalOnly(false);
    setLocalOnlyMode(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const useLocalOnlyMode = useCallback(() => {
    setToken(null);
    setUser(null);
    setLocalOnly(true);
    setLocalOnlyMode(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLocalOnly: localOnly,
        isLoading,
        login,
        register,
        logout,
        useLocalOnly: useLocalOnlyMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}