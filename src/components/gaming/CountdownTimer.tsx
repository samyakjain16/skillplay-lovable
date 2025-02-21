import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onEnd?: () => void;
  initialTimeLeft?: number; // in seconds
}

export const CountdownTimer = ({ targetDate, onEnd, initialTimeLeft }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [hasEnded, setHasEnded] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    // Check if timer has already ended
    if (difference <= 0) {
      if (!hasEnded) {
        setHasEnded(true);
        setTimeLeft("Time's up!");
        onEnd?.();
      }
      return null;
    }

    // For late joiners, use the smaller of calculated time or initialTimeLeft
    let seconds = Math.ceil(difference / 1000);
    if (initialTimeLeft !== undefined) {
      seconds = Math.min(seconds, initialTimeLeft);
    }

    // Ensure we never show negative time
    seconds = Math.max(0, seconds);
    
    return `${seconds}s`;
  }, [targetDate, initialTimeLeft, hasEnded, onEnd]);

  useEffect(() => {
    // Reset states when targetDate changes
    setHasEnded(false);
    
    // Initial calculation
    const initialTime = calculateTimeLeft();
    if (initialTime !== null) {
      setTimeLeft(initialTime);
    }

    // Update every 100ms for smoother countdown
    const timer = setInterval(() => {
      const result = calculateTimeLeft();
      if (result === null) {
        clearInterval(timer);
      } else {
        setTimeLeft(result);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [targetDate, calculateTimeLeft]);

  // Handle case where targetDate is significantly in the past
  useEffect(() => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    if (target - now <= -1000 && !hasEnded) { // More than 1 second past end
      setHasEnded(true);
      setTimeLeft("Time's up!");
      onEnd?.();
    }
  }, [targetDate, hasEnded, onEnd]);

  return (
    <span className={`font-mono ${hasEnded ? 'text-red-500' : ''}`}>
      {timeLeft}
    </span>
  );
};