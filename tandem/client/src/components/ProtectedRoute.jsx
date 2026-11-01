import { Navigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext.jsx';

export default function ProtectedRoute({ children }) {
  const { player } = usePlayer();
  const location = useLocation();

  if (!player) {
    return <Navigate to="/" state={{ message: 'Enter a username first.', from: location.pathname }} replace />;
  }

  return children;
}
