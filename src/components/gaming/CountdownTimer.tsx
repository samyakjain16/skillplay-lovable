
import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onEnd?: () => void;
}

export const CountdownTimer = ({ targetDate, onEnd }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft("Time's up!");
        onEnd?.();
        return null;
      }

      // Calculate time units
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Format the time string
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    if (initialTimeLeft !== null) {
      setTimeLeft(initialTimeLeft);
    }

    // Update every second
    const timer = setInterval(() => {
      const result = calculateTimeLeft();
      if (result === null) {
        clearInterval(timer);
      } else {
        setTimeLeft(result);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onEnd]);

  return <span>{timeLeft}</span>;
};
