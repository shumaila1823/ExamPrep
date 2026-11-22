import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to `deadlineMs` (a timestamp in the browser's clock).
 * Remaining time is always computed from Date.now(), so it stays accurate
 * even if the tab was in the background. `onExpire` fires exactly once.
 * Returns the remaining whole seconds, or null until a deadline is set.
 */
export function useCountdown(deadlineMs, onExpire) {
  const [remaining, setRemaining] = useState(() =>
    deadlineMs == null ? null : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
  );
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const firedRef = useRef(false);

  useEffect(() => {
    if (deadlineMs == null) return undefined;
    firedRef.current = false;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (expireRef.current) expireRef.current();
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadlineMs]);

  return remaining;
}
