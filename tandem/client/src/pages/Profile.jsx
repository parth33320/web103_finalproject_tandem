import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import Spinner from '../components/Spinner.jsx';
import '../styles/Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const { player, setPlayer } = usePlayer();
  const navigate = useNavigate();

  const activePlayer = user || player;

  const [profileData, setProfileData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const fetchProfile = useCallback(async (playerId) => {
    if (!playerId) return;
    setLoading(true);
    setStatsLoading(true);
    setError(null);
    try {
      const [data, stats] = await Promise.all([
        api(`/players/${playerId}`),
        api(`/players/${playerId}/stats`).catch((err) => {
          if (err.status === 404) return null;
          throw err;
        }),
      ]);
      setProfileData(data);
      setStatsData(stats);
      setAvatarUrl(stats?.avatar_url || data?.avatar_url || null);
      setNewUsername(data.username);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePlayer?.id) {
      fetchProfile(activePlayer.id);
    } else {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [activePlayer, fetchProfile]);

  const handleRename = async (e) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setError('Username must be 2–24 characters.');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updated = await api(`/players/${player.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ username: trimmed }),
      });
      setPlayer(updated);
      setProfileData((prev) => ({ ...prev, username: updated.username }));
      setIsEditing(false);
      toast.success('Username updated!');
    } catch (err) {
      console.error('Failed to rename player:', err);
      if (err.status === 409 || err.message?.toLowerCase().includes('taken')) {
        setError('That username is taken.');
      } else {
        setError(err.message || 'Failed to rename player.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your profile? All scores will be removed.')) return;
    setDeleting(true);
    setError(null);
    try {
      await api(`/players/${player.id}`, { method: 'DELETE' });
      setPlayer(null);
      toast.success('Profile deleted.');
      navigate('/');
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setError(err.message || 'Failed to delete profile.');
    } finally {
      setDeleting(false);
    }
  };

  if (!activePlayer) {
    return (
      <section className="profile-container empty-state">
        <h1>Player Profile</h1>
        <p>No player profile loaded. Create or select a username on the Home page to get started!</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </section>
    );
  }

  return (
    <section className="profile-container">
      <h1>Player Profile</h1>

      {loading ? (
        <div className="loading-container">
          <Spinner size="large" />
          <p>Loading profile...</p>
        </div>
      ) : (
        <div className="profile-card">
          {/* Avatar Upload Section */}
          <div className="avatar-section" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {previewUrl || avatarUrl ? (
              <img
                src={previewUrl || avatarUrl}
                alt={profileData?.username || 'Avatar'}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e0' }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#3182ce',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                }}
              >
                {(profileData?.username || activePlayer?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('Upload failed. Max 5MB.');
                      return;
                    }
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isUploading}
                onClick={() => document.getElementById('avatar-file-input')?.click()}
                style={{ marginRight: '0.5rem', padding: '6px 12px', fontSize: '0.9rem' }}
              >
                Change Photo
              </button>
              {selectedFile && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isUploading}
                  onClick={async () => {
                    setIsUploading(true);
                    const formData = new FormData();
                    formData.append('avatar', selectedFile);
                    try {
                      const res = await fetch(`/api/players/${activePlayer.id}/avatar`, {
                        method: 'POST',
                        body: formData,
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Upload failed. Max 5MB.');
                      }
                      const result = await res.json();
                      setAvatarUrl(result.avatar_url);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      toast.success('Profile photo updated!');
                    } catch (err) {
                      toast.error(err.message || 'Upload failed. Max 5MB.');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isUploading && <Spinner size="small" />}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
          </div>

          <div className="profile-header">
            <div className="username-section">
              {!isEditing ? (
                <div className="username-display">
                  <h2>{profileData?.username || player.username}</h2>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => setIsEditing(true)}
                    disabled={updating || deleting}
                  >
                    ✏️ Edit
                  </button>
                </div>
              ) : (
                <form className="rename-form" onSubmit={handleRename}>
                  <input
                    type="text"
                    className="rename-input"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    minLength={2}
                    maxLength={24}
                    disabled={updating}
                  />
                  <button type="submit" className="save-btn" disabled={updating}>
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditing(false);
                      setNewUsername(profileData?.username || player.username);
                      setError(null);
                    }}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="delete-btn"
                onClick={handleDelete}
                disabled={updating || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Profile'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isLoggingOut}
                onClick={async () => {
                  setIsLoggingOut(true);
                  try {
                    await fetch('/auth/logout', { method: 'POST' });
                  } catch {
                    // ignore
                  }
                  toast('Logged out.');
                  navigate('/');
                  setIsLoggingOut(false);
                }}
                style={{ padding: '4px 10px', fontSize: '0.85rem' }}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          {(updating || deleting || clearing || isUploading) && <Spinner size="medium" />}

          <div className="stats-section" style={{ margin: '1.5rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {statsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Spinner size="small" />
                <span>Loading stats...</span>
              </div>
            ) : !statsData ? (
              <span className="no-stats">No stats yet</span>
            ) : (
              <>
                <div className="stat-chip" style={{ background: '#edf2f7', padding: '0.5rem 1rem', borderRadius: '16px', fontWeight: '500' }}>
                  Rounds: {statsData.total_rounds ?? 0}
                </div>
                <div className="stat-chip" style={{ background: '#edf2f7', padding: '0.5rem 1rem', borderRadius: '16px', fontWeight: '500' }}>
                  Best: {parseFloat(statsData.best_score ?? 0)} pts
                </div>
                <div className="stat-chip" style={{ background: '#edf2f7', padding: '0.5rem 1rem', borderRadius: '16px', fontWeight: '500' }}>
                  Avg speed: {statsData.avg_speed_ms ? (statsData.avg_speed_ms / 1000).toFixed(1) : 0}s
                </div>
              </>
            )}
          </div>

          <div className="profile-body">
            <div className="scores-section">
              <h3>10 Recent Scores</h3>
              {profileData?.scores && profileData.scores.length > 0 ? (
                <ul className="scores-list">
                  {profileData.scores.map((scoreItem) => (
                    <li key={scoreItem.id} className="score-item">
                      <span className="score-points">{scoreItem.score} pts</span>
                      <span className="score-dir">
                        {scoreItem.direction === 'zh-ja' ? 'ZH → JA' : 'JA → ZH'}
                      </span>
                      <span className="score-date">
                        {new Date(scoreItem.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-data">No scores logged yet.</p>
              )}
            </div>

            <div className="missed-words-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Missed Words</h3>
                {profileData?.missed_words && profileData.missed_words.length > 0 && (
                  <button
                    type="button"
                    className="clear-history-btn"
                    onClick={() => {
                      setClearing(true);
                      setProfileData((prev) => ({ ...prev, missed_words: [] }));
                      toast.success('Missed words history cleared.');
                      setClearing(false);
                    }}
                    disabled={clearing}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      cursor: clearing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {clearing ? 'Clearing...' : 'Clear History'}
                  </button>
                )}
              </div>
              <ul className="missed-words-list">
                {profileData?.missed_words?.map((item) => (
                  <li key={item.word_id} className="missed-word-item">
                    <div className="missed-header">
                      <span className="missed-kanji">{item.jp_form || item.zh_simplified}</span>
                      <span className="miss-count-tag">Missed {item.total_miss_count}×</span>
                    </div>
                    <div className="missed-details">
                      <span><strong>Japanese:</strong> {item.meaning_ja}</span>
                      <span><strong>Chinese:</strong> {item.meaning_zh}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {(!profileData?.missed_words || profileData.missed_words.length === 0) && (
                <p className="no-data">No missed words recorded!</p>
              )}
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
