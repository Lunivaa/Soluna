import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
  const token = isPreview ? null : (localStorage.getItem('token') || sessionStorage.getItem('token'));
  return (
    <AuthContext.Provider value={{ token, isPreview }}>
      {children}
    </AuthContext.Provider>
  );
}
