import { useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Home from './pages/Home.jsx';
import GamePage from './pages/GamePage.jsx';
import Results from './pages/Results.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import Decks from './pages/Decks.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './hooks/useAuth.js';
import { usePlayer } from './context/PlayerContext.jsx';

export default function App() {
  const { user, setUser } = useAuth();
  const { player, setPlayer, logout } = usePlayer();
  const navigate = useNavigate();
  const prevUserRef = useRef(null);

  useEffect(() => {
    if (!prevUserRef.current && user) {
      toast.success('Logged in as ' + user.username);
      if (!player) {
        setPlayer(user);
      }
    }
    prevUserRef.current = user;
  }, [user, player, setPlayer]);

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    logout();
    toast('Logged out.');
    navigate('/');
  };

  const activeUser = user || player;

  return (
    <>
      <header className="site-header">
        <NavLink className="brand" to="/">Tandem</NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/game">Play</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          {activeUser && (
            <>
              <NavLink to="/decks">My Decks</NavLink>
              <NavLink to="/profile">Profile</NavLink>
            </>
          )}
          {activeUser ? (
            <div className="user-nav-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
              {activeUser.avatar_url ? (
                <img
                  src={activeUser.avatar_url}
                  alt={activeUser.username}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span className="user-badge" style={{ fontSize: '0.9rem', opacity: 0.85 }}>👤 {activeUser.username}</span>
              )}
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Log out
              </button>
            </div>
          ) : (
            <a
              href="/auth/github"
              className="github-login-btn"
              style={{
                marginLeft: '1rem',
                padding: '4px 10px',
                background: '#24292e',
                color: '#fff',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Login with GitHub
            </a>
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
