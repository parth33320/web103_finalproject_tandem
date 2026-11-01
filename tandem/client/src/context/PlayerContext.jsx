import { createContext, useContext, useState } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [player, setPlayerState] = useState(() => {
    try {
      const saved = localStorage.getItem('tandem_player');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setPlayer = (p) => {
    setPlayerState(p);
    try {
      if (p) {
        localStorage.setItem('tandem_player', JSON.stringify(p));
      } else {
        localStorage.removeItem('tandem_player');
      }
    } catch (e) {
      console.error('Failed to save player to localStorage:', e);
    }
  };

  const logout = () => {
    setPlayer(null);
  };

  return <PlayerContext.Provider value={{ player, setPlayer, logout }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
