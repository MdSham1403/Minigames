import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute     from './components/AdminRoute';
import Navbar         from './components/Navbar';

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
        <Route path="/"            element={<Home />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/signup"      element={<Signup />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/lobby"   element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin"   element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
