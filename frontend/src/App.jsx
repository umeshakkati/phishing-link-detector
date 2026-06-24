import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Scanner from "./pages/Scanner";
import BulkScanner from "./pages/BulkScanner";
import Dashboard from "./pages/Dashboard";
import ThreatFeed from "./pages/ThreatFeed";
import Leaderboard from "./pages/Leaderboard";
import EmailAnalyzer from "./pages/EmailAnalyzer";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Redirects to /login if not authenticated
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

// Shows landing page to guests, redirects logged-in users to scanner
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/scanner" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing — guests only */}
      <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />

      {/* Auth pages */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Public pages (no auth required) */}
      <Route path="/feed" element={<WithNav><ThreatFeed /></WithNav>} />
      <Route path="/leaderboard" element={<WithNav><Leaderboard /></WithNav>} />

      {/* Protected pages */}
      <Route path="/scanner" element={<PrivateRoute><WithNav><Scanner /></WithNav></PrivateRoute>} />
      <Route path="/bulk" element={<PrivateRoute><WithNav><BulkScanner /></WithNav></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><WithNav><Dashboard /></WithNav></PrivateRoute>} />
      <Route path="/email-analyzer" element={<PrivateRoute><WithNav><EmailAnalyzer /></WithNav></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><WithNav><Settings /></WithNav></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><WithNav><AdminPanel /></WithNav></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function WithNav({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
