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
  };
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  isInMyContests?: boolean;
}

type ButtonState = {
  text: string;
  variant: "default" | "secondary" | "destructive";
  disabled: boolean;
  showProgress: boolean;
  customClass: string;
  error?: string;
};

export const ContestStatusButton = ({ 
  contest, 
  onClick, 
  loading, 
  disabled, 
  isInMyContests 
}: ContestStatusButtonProps) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const getTimeStatus = useCallback(() => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    
    return {
      hasStarted: now >= startTime,
      hasEnded: now > endTime,
      progress: Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100),
      currentGameIndex: Math.floor(elapsed / 30000), // 30 seconds per game
    };
  }, [contest.start_time, contest.end_time]);

  const getContestState = useCallback((): ButtonState => {
    const { hasStarted, hasEnded, currentGameIndex } = getTimeStatus();
    const isContestFull = contest.current_participants >= contest.max_participants;

    if (hasEnded || contest.status === "completed") {
      return {
        text: "Completed",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: "bg-gray-600 text-white",
      };
    }

    if (isInMyContests) {
      if (!hasStarted) {
        return {
          text: "Pending",
          variant: "secondary",
          disabled: true,
          showProgress: false,
          customClass: "bg-gray-600 text-white",
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

    if (isContestFull) {
      return {
        text: "Contest Full",
        variant: "secondary",
        disabled: true,
        showProgress: contest.status === "in_progress",
        customClass: "bg-gray-600 text-white",
      };
    }

    if (hasStarted) {
      return {
        text: `Join Game ${currentGameIndex + 1}`,
        variant: "default",
        disabled: false,
        showProgress: true,
        customClass: "bg-green-500 hover:bg-green-600 text-white",
      };
    }

    return {
      text: "Join Contest",
      variant: "default",
      disabled: false,
      showProgress: false,
      customClass: "bg-green-500 hover:bg-green-600 text-white",
    };
  }, [contest, isInMyContests, getTimeStatus]);

  useEffect(() => {
    if (contest.status !== "in_progress") {
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateProgress = () => {
      const { progress, hasEnded } = getTimeStatus();
      setProgress(progress);

      if (hasEnded || progress >= 100) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["contest", contest.id] });
      }
    };

    updateProgress();
    if (!intervalRef.current) {
      intervalRef.current = setInterval(updateProgress, 1000);
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
      {error && (
        <div className="text-red-500 text-sm mb-2 text-center">
          {error}
        </div>
      )}
      <Button 
        className={`w-full relative overflow-hidden transition-all duration-500 ${buttonState.customClass}`}
        variant={buttonState.variant}
        disabled={disabled || buttonState.disabled}
        onClick={onClick}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isInMyContests ? "Loading..." : "Joining..."}
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