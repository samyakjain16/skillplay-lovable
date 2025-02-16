
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  
  useEffect(() => {
    if (contest.status !== 'in_progress') {
      setProgress(0);
      return;
    }

    const calculateProgress = () => {
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(contest.end_time);
      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    };

    // Set initial progress
    setProgress(calculateProgress());

    // Update progress every second
    const interval = setInterval(() => {
      const newProgress = calculateProgress();
      setProgress(newProgress);
      
      // Clear interval if contest has ended
      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest.status, contest.start_time, contest.end_time]);

  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const isFullyBooked = contest.current_participants >= contest.max_participants;

  const getButtonContent = () => {
    // Check for completed contests first
    if (contest.status === 'completed' || now > endTime) {
      return {
        text: "Completed",
        variant: "secondary" as const,
        disabled: true,
        showProgress: false,
        customClass: "bg-[#333333] hover:bg-[#333333] text-white"
      };
    }

    // Contest is in progress
    if (contest.status === 'in_progress') {
      if (startTime <= now && now < endTime) {
        return {
          text: "Start Contest",
          variant: "default" as const,
          disabled: false,
          showProgress: true,
          customClass: ""
        };
      }
      return {
        text: "In Progress",
        variant: "secondary" as const,
        disabled: true,
        showProgress: true,
        customClass: ""
      };
    }

    // For My Contests section
    if (isInMyContests) {
      // Check if contest should be started
      if (startTime <= now && contest.status === 'upcoming') {
        return {
          text: "Start Contest",
          variant: "default" as const,
          disabled: false,
          showProgress: false,
          customClass: ""
        };
      }
      // Default state for joined contests
      return {
        text: "Pending",
        variant: "secondary" as const,
        disabled: true,
        showProgress: false,
        customClass: ""
      };
    }

    // For Available Contests section
    if (isFullyBooked && startTime <= now && contest.status === 'upcoming') {
      return {
        text: "Start Contest",
        variant: "default" as const,
        disabled: false,
        showProgress: false,
        customClass: ""
      };
    }

    // Default state for available contests
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
            {isFullyBooked ? "Starting..." : "Joining..."}
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
              className="h-full bg-primary transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                transition: 'width 1s linear'
              }}
            />
          </div>
        )}
      </Button>
    </div>
  );
};
