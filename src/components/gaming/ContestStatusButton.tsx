
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

interface ContestStatusButtonProps {
  contest: {
    status: string;
    start_time: string;
    end_time: string;
    current_participants: number;
    max_participants: number;
  };
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  isInMyContests?: boolean;
}

export const ContestStatusButton = ({ contest, onClick, loading, disabled, isInMyContests }: ContestStatusButtonProps) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateProgress = useCallback(() => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }, [contest.start_time, contest.end_time]);

  // Update progress when contest data changes
  useEffect(() => {
    if (contest.status !== 'in_progress') {
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calculate initial progress
    setProgress(calculateProgress());

    // Set up interval for real-time updates
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const newProgress = calculateProgress();
        setProgress(newProgress);

        if (newProgress >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);
    }

    // Cleanup interval on unmount or when contest status changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [contest.status, contest.start_time, contest.end_time, calculateProgress]);

  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const isContestEnded = now > endTime || contest.status === 'completed';
  const isContestFull = contest.current_participants >= contest.max_participants;
  const hasContestStarted = now >= startTime;

  const getButtonContent = () => {
    if (isContestEnded) {
      return {
        text: "Completed",
        variant: "secondary" as const,
        disabled: true,
        showProgress: false,
        customClass: "bg-[#333333] hover:bg-[#333333] text-white"
      };
    }

    if (isInMyContests) {
      if (!hasContestStarted) {
        return {
          text: "Pending",
          variant: "secondary" as const,
          disabled: true,
          showProgress: false,
          customClass: ""
        };
      }

      if (contest.status === 'in_progress') {
        return {
          text: "Start Contest",
          variant: "default" as const,
          disabled: false,
          showProgress: true,
          customClass: ""
        };
      }

      if (contest.status === 'upcoming' && hasContestStarted) {
        return {
          text: "Start Contest",
          variant: "default" as const,
          disabled: false,
          showProgress: false,
          customClass: ""
        };
      }

      return {
        text: "Pending",
        variant: "secondary" as const,
        disabled: true,
        showProgress: false,
        customClass: ""
      };
    }

    if (isContestFull) {
      return {
        text: "Contest Full",
        variant: "secondary" as const,
        disabled: true,
        showProgress: contest.status === 'in_progress',
        customClass: ""
      };
    }

    if (contest.status === 'in_progress') {
      return {
        text: "Join Contest",
        variant: "default" as const,
        disabled: false,
        showProgress: true,
        customClass: ""
      };
    }

    return {
      text: "Join Contest",
      variant: "default" as const,
      disabled: false,
      showProgress: false,
      customClass: ""
    };
  };

  const buttonContent = getButtonContent();

  return (
    <div className="relative w-full">
      <Button 
        className={`w-full relative overflow-hidden ${buttonContent.customClass} ${buttonContent.disabled && !buttonContent.customClass ? 'bg-gray-300 hover:bg-gray-300' : ''}`}
        variant={buttonContent.variant}
        disabled={disabled || buttonContent.disabled}
        onClick={onClick}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isInMyContests ? "Starting..." : "Joining..."}
          </>
        ) : (
          buttonContent.text
        )}
        
        {/* Progress bar overlay */}
        {buttonContent.showProgress && (
          <div 
            className="absolute left-0 bottom-0 h-1 bg-primary/20"
            style={{ width: '100%' }}
          >
            <div 
              className="h-full bg-primary"
              style={{ 
                width: `${progress}%`,
                transition: 'width 0.5s linear'
              }}
            />
          </div>
        )}
      </Button>
    </div>
  );
};
