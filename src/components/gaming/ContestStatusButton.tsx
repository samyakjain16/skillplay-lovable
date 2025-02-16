
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
}

export const ContestStatusButton = ({ contest, onClick, loading, disabled }: ContestStatusButtonProps) => {
  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const isFullyBooked = contest.current_participants >= contest.max_participants;
  
  // Calculate progress percentage for active contests
  const getProgressPercentage = () => {
    if (contest.status !== 'in_progress') return 0;
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const getButtonContent = () => {
    // Contest has ended
    if (now > endTime) {
      return {
        text: "Completed",
        variant: "secondary" as const,
        disabled: true,
        showProgress: false
      };
    }

    // Contest is in progress
    if (contest.status === "in_progress") {
      return {
        text: "In Progress",
        variant: "secondary" as const,
        disabled: true,
        showProgress: true
      };
    }

    // Contest can start (full capacity reached)
    if (startTime <= now && isFullyBooked) {
      return {
        text: "Start Contest",
        variant: "default" as const,
        disabled: false,
        showProgress: false
      };
    }

    // Waiting for more players
    if (startTime <= now) {
      return {
        text: `Waiting for Players (${contest.current_participants}/${contest.max_participants})`,
        variant: "secondary" as const,
        disabled: true,
        showProgress: false
      };
    }

    // Starting soon (within 30 minutes)
    const timeUntilStart = startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeUntilStart / (1000 * 60));
    
    if (minutesUntilStart <= 30) {
      return {
        text: `Starting in ${minutesUntilStart} minutes`,
        variant: "secondary" as const,
        disabled: true,
        showProgress: false
      };
    }

    // Default state (shows start time)
    return {
      text: `Starts at ${format(startTime, 'h:mm a')}`,
      variant: "secondary" as const,
      disabled: true,
      showProgress: false
    };
  };

  const buttonContent = getButtonContent();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="relative w-full">
      <Button 
        className="w-full relative overflow-hidden"
        variant={buttonContent.variant}
        disabled={disabled || buttonContent.disabled}
        onClick={onClick}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
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
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </Button>
    </div>
  );
};
