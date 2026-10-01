import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setToken, hasToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMe = useCallback(async () => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // the API client clears the token when the server rejects it
  useEffect(() => {
    const onSignedOut = () => setUser(null);
    window.addEventListener("hush:signed-out", onSignedOut);
    return () => window.removeEventListener("hush:signed-out", onSignedOut);
  }, []);

  const login = async (email, password) => {
    setError("");
    const { user, token } = await api.login({ email, password });
    setToken(token);
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    setError("");
    const { user, token } = await api.register({ name, email, password });
    setToken(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
