import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onEnd?: () => void;
  className?: string;
}

export const CountdownTimer = ({ targetDate, onEnd, className }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [hasEnded, setHasEnded] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    // Handle expired timer
    if (difference <= 0) {
      if (!hasEnded) {
        setHasEnded(true);
        setTimeLeft("Time's up!");
        onEnd?.();
      }
      return null;
    }

    // Return seconds with one decimal place for smoother display
    const seconds = (difference / 1000).toFixed(1);
    return `${seconds}s`;
  }, [targetDate, hasEnded, onEnd]);

  useEffect(() => {
    // Reset state when target date changes
    setHasEnded(false);
    
    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    if (initialTimeLeft !== null) {
      setTimeLeft(initialTimeLeft);
    }

    // Update every 100ms for smooth countdown
    const timer = setInterval(() => {
      const result = calculateTimeLeft();
      if (result === null) {
        clearInterval(timer);
      } else {
        setTimeLeft(result);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [targetDate, calculateTimeLeft]);

  return <span className={className}>{timeLeft}</span>;
};