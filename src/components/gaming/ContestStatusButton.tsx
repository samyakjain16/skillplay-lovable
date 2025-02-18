import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface ContestStatusButtonProps {
  contest: {
    id: string;
    status: string;
    start_time: string;
    end_time: string;
    current_participants: number;
    max_participants: number;
    series_count: number;
  };
  onClick?: () => void;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

type ButtonState = {
  text: string;
  variant: "default" | "secondary" | "destructive";
  disabled: boolean;
  showProgress: boolean;
  customClass: string;
};

export const ContestStatusButton = ({ 
  contest, 
  onClick, 
  loading,
  isInMyContests,
  userCompletedGames 
}: ContestStatusButtonProps) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const getTimeStatus = useCallback(() => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    const currentGameIndex = Math.floor(elapsed / 30000); // 30 seconds per game
    
    return {
      hasStarted: now >= startTime,
      hasEnded: now > endTime,
      progress: Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100),
      currentGameIndex,
      remainingTime: endTime.getTime() - now.getTime()
    };
  }, [contest.start_time, contest.end_time]);

  const getContestState = useCallback((): ButtonState => {
    const { hasStarted, hasEnded, currentGameIndex, remainingTime } = getTimeStatus();
    const isContestFull = contest.current_participants >= contest.max_participants;

    // For completed contests
    if (hasEnded || contest.status === "completed") {
      return {
        text: "View Leaderboard",
        variant: "secondary",
        disabled: false,
        showProgress: false,
        customClass: "bg-gray-600 hover:bg-gray-700 text-white",
      };
    }

    // For contests in My Contests
    if (isInMyContests) {
      if (!hasStarted) {
        return {
          text: "Starting Soon",
          variant: "secondary",
          disabled: true,
          showProgress: false,
          customClass: "bg-gray-400 text-white cursor-not-allowed",
        };
      }

      if (userCompletedGames) {
        return {
          text: "Games Completed",
          variant: "secondary",
          disabled: true,
          showProgress: false,
          customClass: "bg-blue-600 text-white",
        };
      }

      return {
        text: `Continue Game ${currentGameIndex + 1}`,
        variant: "default",
        disabled: false,
        showProgress: true,
        customClass: "bg-blue-500 hover:bg-blue-600 text-white",
      };
    }

    // For Available Contests
    if (isContestFull) {
      return {
        text: "Contest Full",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: "bg-gray-600 text-white",
      };
    }

    if (!hasStarted) {
      return {
        text: "Join Contest",
        variant: "default",
        disabled: false,
        showProgress: false,
        customClass: "bg-green-500 hover:bg-green-600 text-white",
      };
    }

    // Check if enough time to join
    const minimumTimeNeeded = contest.series_count * 30000; // series_count * 30 seconds
    if (remainingTime < minimumTimeNeeded) {
      return {
        text: "Ending Soon",
        variant: "destructive",
        disabled: true,
        showProgress: false,
        customClass: "bg-red-500 text-white",
      };
    }

    return {
      text: `Join Game ${currentGameIndex + 1}`,
      variant: "default",
      disabled: false,
      showProgress: true,
      customClass: "bg-green-500 hover:bg-green-600 text-white",
    };
  }, [contest, isInMyContests, userCompletedGames, getTimeStatus]);

  const handleClick = async () => {
    if (loading || buttonState.disabled) return;
    
    setLocalLoading(true);
    try {
      await onClick?.();
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    const updateProgress = () => {
      const { progress, hasEnded } = getTimeStatus();
      setProgress(progress);

      if (hasEnded) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        queryClient.invalidateQueries({ queryKey: ["contest", contest.id] });
      }
    };

    // Only start progress tracking for active contests
    if (contest.status === "in_progress") {
      updateProgress();
      if (!intervalRef.current) {
        intervalRef.current = setInterval(updateProgress, 1000);
      }
    } else {
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [contest.status, contest.id, getTimeStatus, queryClient]);

  const buttonState = getContestState();

  return (
    <div className="relative w-full">
      <Button 
        className={`w-full relative overflow-hidden transition-all duration-500 ${buttonState.customClass}`}
        variant={buttonState.variant}
        disabled={localLoading || buttonState.disabled}
        onClick={handleClick}
      >
        {localLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isInMyContests ? "Starting..." : "Joining..."}
          </>
        ) : buttonState.showProgress ? (
          <>
            <span className="relative z-10">{buttonState.text}</span>
            <div 
              className="absolute left-0 top-0 h-full bg-opacity-20 bg-black transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </>
        ) : (
          buttonState.text
        )}
      </Button>
    </div>
  );
};
