import '../styles/Timer.css';

export default function Timer({ secondsLeft = 10, totalSeconds = 10 }) {
  const percentage = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <div className="timer-container">
      <div className="timer-header">
        <span className="timer-label">Time Remaining</span>
        <span className={`timer-seconds ${secondsLeft <= 3 ? 'warning' : ''}`}>
          {secondsLeft}s
        </span>
      </div>
      <div className="timer-bar-bg">
        <div
          className={`timer-bar-fill ${secondsLeft <= 3 ? 'warning' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
