
import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onEnd?: () => void;
}

export const CountdownTimer = ({ targetDate, onEnd }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        if (!hasEnded) {
          setHasEnded(true);
          setTimeLeft("Time's up!");
          onEnd?.();
        }
        return null;
      }

      // Round to nearest second for display
      const seconds = Math.ceil(difference / 1000);
      return `${seconds}s`;
    };

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    if (initialTimeLeft !== null) {
      setTimeLeft(initialTimeLeft);
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

    return () => clearInterval(timer);
  }, [targetDate, onEnd, hasEnded]);

  return <span>{timeLeft}</span>;
};
