import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import GamePage from './pages/GamePage.jsx';
import Results from './pages/Results.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import Decks from './pages/Decks.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { usePlayer } from './context/PlayerContext.jsx';

export default function App() {
  const { player, logout } = usePlayer();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="site-header">
        <NavLink className="brand" to="/">Tandem</NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/game">Play</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/decks">My Decks</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          {player && (
            <div className="user-nav-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
              <span className="user-badge" style={{ fontSize: '0.9rem', opacity: 0.85 }}>👤 {player.username}</span>
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Log out
              </button>
            </div>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/results" element={<Results />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route
            path="/decks"
            element={
              <ProtectedRoute>
                <Decks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<section><h1>Page not found</h1><NavLink to="/">Go home</NavLink></section>} />
        </Routes>
      </main>
    </>
  );
}
