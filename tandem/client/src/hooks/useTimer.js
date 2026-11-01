import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer({ duration = 10, onExpire } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newDuration = duration) => {
    setSecondsLeft(newDuration);
    setIsExpired(false);
    setIsRunning(true);
  }, [duration]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    if (secondsLeft <= 0) {
      setIsRunning(false);
      setIsExpired(true);
      if (onExpireRef.current) {
        onExpireRef.current();
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setIsExpired(true);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  return { secondsLeft, isRunning, isExpired, start, stop, reset };
}
