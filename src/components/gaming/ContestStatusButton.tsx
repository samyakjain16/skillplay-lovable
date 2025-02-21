import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { getContestState, getTimeStatus } from "./utils/contestButtonUtils";
import { type Contest } from "./ContestTypes";
import { useEffect, useState } from "react";

interface ContestStatusButtonProps {
  contest: Contest;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
  currentGameIndex?: number;
  onClick?: () => void;
  className?: string;
}

export const ContestStatusButton = ({
  contest,
  loading = false,
  isInMyContests = false,
  userCompletedGames = false,
  currentGameIndex,
  onClick,
  className = "",
}: ContestStatusButtonProps) => {
  // State for progress updates
  const [timeStatus, setTimeStatus] = useState(() => 
    getTimeStatus(contest.start_time, contest.end_time)
  );

  // Update progress periodically
  useEffect(() => {
    if (!isInMyContests || userCompletedGames) return;

    const intervalId = setInterval(() => {
      setTimeStatus(getTimeStatus(contest.start_time, contest.end_time));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [contest.start_time, contest.end_time, isInMyContests, userCompletedGames]);

  const buttonState = getContestState(
    contest, 
    isInMyContests, 
    userCompletedGames, 
    currentGameIndex
  );

  const combinedClassName = `w-full relative ${buttonState.customClass} ${className}`.trim();

  return (
    <Button
      variant={buttonState.variant}
      disabled={buttonState.disabled || loading}
      className={combinedClassName}
      onClick={onClick}
      aria-label={buttonState.text}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {buttonState.showProgress && (
            <>
              {/* Contest overall progress */}
              <Progress 
                value={timeStatus.progress} 
                className="absolute inset-0 opacity-20" 
                aria-label="Contest progress"
              />
              {/* Current game progress */}
              <Progress 
                value={timeStatus.gameProgress} 
                className="absolute inset-0" 
                aria-label="Current game progress"
              />
            </>
          )}
          <span className="relative z-10">{buttonState.text}</span>
        </>
      )}
    </Button>
  );
};