import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute     from './components/AdminRoute';
import Navbar         from './components/Navbar';
import GuestRoute     from './components/GuestRoute'; 

import Home        from './pages/Home';
import Login       from './pages/Login';
import Signup      from './pages/Signup';
import GameLobby   from './pages/GameLobby';
import Leaderboard from './pages/Leaderboard';
import Profile     from './pages/Profile';
import AdminPanel  from './pages/AdminPanel';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/"            element={<Home />} />
        
        {/* 🔒 Guest Only Routes: Safe from duplicate overrides now */}
        <Route path="/login"       element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup"      element={<GuestRoute><Signup /></GuestRoute>} />
        
        {/* Public Scoreboards */}
        <Route path="/leaderboard" element={<Leaderboard />} />
        
        {/* 🛡️ Protected User Routes */}
        <Route path="/lobby"       element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
        <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        {/* ⚙️ Protected Admin Route */}
        <Route path="/admin"       element={<AdminRoute><AdminPanel /></AdminRoute>} />
        
        {/* Fallback Catch-All */}
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;