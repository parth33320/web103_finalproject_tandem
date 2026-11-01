import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import '../styles/Leaderboard.css';

export default function Leaderboard() {
  const [direction, setDirection] = useState('zh-ja');
  const [sort, setSort] = useState('score');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/leaderboard?direction=${direction}&sort=${sort}`);
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, [direction, sort]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all leaderboard scores?')) return;
    setResetting(true);
    setError(null);
    try {
      await api('/reset', { method: 'POST' });
      await fetchLeaderboard();
    } catch (err) {
      console.error('Failed to reset leaderboard:', err);
      setError(err.message || 'Failed to reset leaderboard.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="leaderboard-container">
      <h1>Leaderboard</h1>
      <p className="leaderboard-subtitle">Top players for Chinese & Japanese cognate quizzes.</p>

      <div className="leaderboard-controls">
        <div className="control-group">
          <label className="control-label">Direction:</label>
          <div className="toggle-buttons">
            <button
              type="button"
              className={`toggle-btn ${direction === 'zh-ja' ? 'active' : ''}`}
              onClick={() => setDirection('zh-ja')}
              disabled={loading || resetting}
            >
              Chinese → Japanese
            </button>
            <button
              type="button"
              className={`toggle-btn ${direction === 'ja-zh' ? 'active' : ''}`}
              onClick={() => setDirection('ja-zh')}
              disabled={loading || resetting}
            >
              Japanese → Chinese
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Sort By:</label>
          <div className="toggle-buttons">
            <button
              type="button"
              className={`toggle-btn ${sort === 'score' ? 'active' : ''}`}
              onClick={() => setSort('score')}
              disabled={loading || resetting}
            >
              Score
            </button>
            <button
              type="button"
              className={`toggle-btn ${sort === 'date' ? 'active' : ''}`}
              onClick={() => setSort('date')}
              disabled={loading || resetting}
            >
              Date
            </button>
          </div>
        </div>

        <button
          type="button"
          className="reset-btn"
          onClick={handleReset}
          disabled={loading || resetting}
        >
          {resetting ? 'Resetting...' : 'Reset Leaderboard'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {(loading || resetting) ? (
        <div className="loading-container">
          <Spinner size="medium" />
          <p>Loading leaderboard...</p>
        </div>
      ) : (
        <div className="table-responsive">
          {entries.length === 0 ? (
            <p className="empty-msg">No scores logged for this direction yet. Play a game to get on the board!</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Best Score</th>
                  <th>Last Played</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.player_id || index}>
                    <td className="rank-col">#{index + 1}</td>
                    <td className="username-col">{entry.username}</td>
                    <td className="score-col">{Number(entry.best_score).toFixed(0)} pts</td>
                    <td className="date-col">
                      {entry.last_played_at
                        ? new Date(entry.last_played_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
