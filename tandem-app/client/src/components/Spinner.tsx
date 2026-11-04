/** Gold ring spinner with a label for screen readers. */
export function Spinner({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-3 ${className}`}>
      <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </span>
  );
}

/** Centered spinner for a whole page section. */
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return <div className="flex justify-center py-16"><Spinner label={label} /></div>;
}

/** Friendly error box with an optional retry. */
export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="glass mx-auto max-w-md rounded-2xl p-6 text-center">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">Try again</button>}
    </div>
  );
}
