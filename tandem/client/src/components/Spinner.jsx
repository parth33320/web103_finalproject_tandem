import '../styles/Spinner.css';

export default function Spinner({ size = 'medium', className = '' }) {
  return (
    <div className={`spinner-container ${className}`} aria-label="Loading">
      <div className={`spinner ${size}`} />
    </div>
  );
}
