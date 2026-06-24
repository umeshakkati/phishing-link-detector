import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, LogOut, User, BarChart2, Sun, Moon, Globe,
  ListFilter, Key, Settings, ShieldAlert, Trophy
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      className={`text-sm flex items-center gap-1 transition-colors ${
        pathname === to ? "text-blue-400" : "text-gray-400 hover:text-white"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}{label}
    </Link>
  );

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <Link to={user ? "/scanner" : "/"} className="flex items-center gap-2 text-blue-400 font-bold text-xl hover:text-blue-300 transition-colors flex-shrink-0">
        <Shield className="w-6 h-6" />
        PhishGuard AI
      </Link>

      <div className="flex items-center gap-4 flex-wrap">
        {navLink("/scanner", "Scanner")}
        {navLink("/bulk", "Bulk Scan")}
        {navLink("/feed", "Threat Feed", Globe)}
        {navLink("/leaderboard", "Leaderboard", Trophy)}
        {user && navLink("/dashboard", "Dashboard", BarChart2)}
        {user && navLink("/email-analyzer", "Email Analyzer")}
        {user?.role === "admin" && navLink("/admin", "Admin", ShieldAlert)}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggle}
          className="btn-secondary p-2 rounded-lg"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user ? (
          <>
            <Link to="/settings" className="btn-secondary p-2 rounded-lg" title="Settings">
              <Settings className="w-4 h-4" />
            </Link>
            <span className="text-gray-400 text-sm flex items-center gap-1 hidden sm:flex">
              <User className="w-4 h-4" /> {user.username}
            </span>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="btn-secondary flex items-center gap-1 text-sm py-1.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary text-sm py-1.5">Login</Link>
            <Link to="/register" className="btn-primary text-sm py-1.5">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
