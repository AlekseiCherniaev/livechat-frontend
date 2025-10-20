import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';
import RoomPage from '../pages/RoomPage';
import AnalyticsPage from '../pages/AnalyticsPage';

const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" />;
  return children;
};

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/me" /> : <Navigate to="/login" />} />

      <Route
        path="/me"
        element={
          <ProtectedRoute user={user}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute user={user}>
            <RoomPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute user={user}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/me" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/login" />} />
    </Routes>
  );
}
