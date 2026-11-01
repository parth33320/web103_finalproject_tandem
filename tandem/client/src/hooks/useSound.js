import { useState, useCallback } from 'react';

export function useSound() {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('tandem_muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tandem_muted', String(next));
      } catch (e) {
        console.error('Failed to save sound mute state:', e);
      }
      return next;
    });
  }, []);

  const playSound = useCallback((path) => {
    if (isMuted) return;
    try {
      const audio = new Audio(path);
      audio.play().catch(() => {
        // tolerate missing clips or autoplay blocks
      });
    } catch {
      // ignore audio errors
    }
  }, [isMuted]);

  return { isMuted, toggleMute, playSound };
}
