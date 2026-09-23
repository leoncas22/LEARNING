import { useEffect, useState } from 'react';

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Countdown display only — the real deadline is enforced server-side (see
 * quizAttempt.service.js::ensureNotExpired). If this timer and the
 * backend ever disagree, the backend wins; onExpire here just triggers a
 * submit call, whose result reflects whatever the server actually decided.
 */
export function QuizTimer({ deadline, onExpire }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = deadline ? new Date(deadline).getTime() - now : null;

  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      onExpire?.();
    }
  }, [remainingMs === null ? null : remainingMs <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!deadline) return null;

  const isUrgent = remainingMs <= 10 * 60 * 1000; // 10 minutes
  const isCritical = remainingMs <= 60 * 1000; // 1 minute

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        isCritical ? 'bg-burgundy/10 text-burgundy' : isUrgent ? 'bg-gold/10 text-gold' : 'bg-cream text-espresso'
      }`}
      role="timer"
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <span aria-hidden="true">⏱</span>
      <span>
        {remainingMs <= 0 ? 'Time is up. Your attempt is being submitted.' : `Time Remaining: ${formatTime(remainingMs)}`}
      </span>
      {isCritical && remainingMs > 0 && <span className="sr-only">Less than one minute remaining</span>}
    </div>
  );
}

export default QuizTimer;
