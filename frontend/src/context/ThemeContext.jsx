import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../api/client";

const ThemeContext = createContext({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sync with user preference from server
  useEffect(() => {
    if (user?.theme) setTheme(user.theme);
  }, [user]);

  const toggle = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (user) {
      try { await api.patch("/api/users/me", { theme: next }); } catch {}
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
