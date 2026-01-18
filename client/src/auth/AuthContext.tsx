import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

type User = {
  userName: string;
  isAdmin: boolean;
  firstName?: string;
  lastName?: string;
  homeLocation?: string;
  token?: string;
} | null;

type AuthContextType = {
  user: User;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication status on initial load and route changes
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        console.log('Retrieved token:', token);
        
        if (!token) {
          console.log('No token available - logging out');
          handleLogout();
          return;
        }

        const response = await fetch(API_ENDPOINTS.AUTH_CHECK, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Auth check response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Auth check failed:', response.status, errorData);
          handleLogout();
          return;
        }

        const userData = await response.json();
        console.log('User data received:', userData);
        
        setUser({
          userName: userData.userName, // Changed from userEmail to userName
          isAdmin: userData.isAdmin,
          firstName: userData.firstName,
          lastName: userData.lastName,
          homeLocation: userData.homeLocation,
          token
        });

        if (location.pathname === '/') {
          navigate('/heli');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const login = async (userName: string, password: string) => { // Changed parameter from userEmail to userName
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, password }) // Changed from userEmail to userName
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response:', data);

      const authToken = data.token || 
                       (data.user?.tokens?.length > 0 ? data.user.tokens[0].token : null);

      if (!authToken) {
        throw new Error('No authentication token received from server');
      }

      localStorage.setItem('token', authToken);
      
      setUser({
        userName: data.user.userName, // Changed from userEmail to userName
        isAdmin: data.user.isAdmin,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        homeLocation: data.user.homeLocation,
        token: authToken
      });
      
      navigate('/heli');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};