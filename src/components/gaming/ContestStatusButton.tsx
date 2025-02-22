import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTimeStatus } from "./utils/contestButtonUtils";
import { ContestProgressBar } from "./ContestProgressBar";
import { type Contest } from "./ContestTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ContestStatusButtonProps {
  contest: Pick<Contest, "id" | "status" | "start_time" | "end_time" | "current_participants" | "max_participants" | "series_count" | "contest_type">;
  onClick?: () => void;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

export const ContestStatusButton = ({ 
  contest, 
  onClick, 
  loading,
  isInMyContests,
  userCompletedGames 
}: ContestStatusButtonProps) => {
  const { user } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGameNumber, setCurrentGameNumber] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const fetchGameNumber = async () => {
    if (!user || !isInMyContests) return;

    try {
      // Get contest start time and user's progress
      const { data: contestData } = await supabase
        .from('contests')
        .select(`
          start_time,
          user_contests!inner (
            current_game_index,
            completed_games,
            current_game_start_time
          )
        `)
        .eq('id', contest.id)
        .eq('user_contests.user_id', user.id);

      if (!contestData || contestData.length === 0) return;

      const userContest = contestData[0].user_contests[0];
      const completedGames = userContest.completed_games || [];
      
      // Calculate time-based game number
      const contestStartTime = new Date(contestData[0].start_time);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - contestStartTime.getTime()) / 1000);
      const timeBasedGameNumber = Math.floor(elapsedSeconds / 30) + 1; // +1 for display

      // Calculate effective game number based on completed games and current index
      const gameFromIndex = userContest.current_game_index + 1;
      const gameFromCompleted = completedGames.length + 1;
      
      // Use the maximum of all calculations
      const effectiveGameNumber = Math.max(timeBasedGameNumber, gameFromIndex, gameFromCompleted);
      
      // Only update if it's within the series count
      if (effectiveGameNumber <= contest.series_count) {
        setCurrentGameNumber(effectiveGameNumber);
      }
    } catch (error) {
      console.error('Error fetching game number:', error);
    }
  };

  useEffect(() => {
    fetchGameNumber();
    
    if (isInMyContests && contest.status === "in_progress") {
      gameCheckIntervalRef.current = setInterval(fetchGameNumber, 5000);
    }

    return () => {
      if (gameCheckIntervalRef.current) {
        clearInterval(gameCheckIntervalRef.current);
      }
    };
  }, [isInMyContests, contest.status, contest.id, user?.id]);

  useEffect(() => {
    const updateProgress = () => {
      const { progress, hasEnded } = getTimeStatus(contest.start_time, contest.end_time);
      setProgress(progress);

      if (hasEnded) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        queryClient.invalidateQueries({ queryKey: ["contest", contest.id] });
      }
    };

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
  }, [contest.status, contest.id, contest.start_time, contest.end_time, queryClient]);

  const handleClick = async () => {
    if (loading || buttonState.disabled) return;
    
    setLocalLoading(true);
    try {
      await onClick?.();
    } finally {
      setLocalLoading(false);
    }
  };

  let buttonText = "Join Contest";
  if (!isInMyContests && contest.contest_type === 'fixed_participants') {
    buttonText = `Join (${contest.current_participants}/${contest.max_participants})`;
  }

  const buttonState = {
    text: buttonText,
    variant: "default" as const,
    disabled: false,
    showProgress: contest.status === "in_progress",
    customClass: "bg-green-500 hover:bg-green-600 text-white"
  };

  if (isInMyContests) {
    const isWaitingForPlayers = 
      contest.contest_type === 'fixed_participants' && 
      contest.current_participants < contest.max_participants;

    if (isWaitingForPlayers) {
      buttonState.text = `Waiting for Players (${contest.current_participants}/${contest.max_participants})`;
      buttonState.disabled = true;
      buttonState.customClass = "bg-gray-400 text-white cursor-not-allowed";
    } else if (contest.status === "completed") {
      buttonState.text = "View Leaderboard";
      buttonState.variant = "default";
      buttonState.customClass = "bg-gray-600 hover:bg-gray-700 text-white";
    } else if (userCompletedGames) {
      buttonState.text = "Games Completed";
      buttonState.disabled = true;
      buttonState.customClass = "bg-blue-600 text-white";
    } else if (contest.status === "in_progress") {
      buttonState.text = currentGameNumber 
        ? `Continue Game ${currentGameNumber}/${contest.series_count}`
        : "Continue Playing";
      buttonState.customClass = "bg-blue-500 hover:bg-blue-600 text-white";
    } else {
      buttonState.text = "Start Playing";
      buttonState.customClass = "bg-blue-500 hover:bg-blue-600 text-white";
    }
  } else {
    if (contest.current_participants >= contest.max_participants) {
      buttonState.text = "Contest Full";
      buttonState.variant = "default";
      buttonState.disabled = true;
      buttonState.customClass = "bg-gray-600 text-white";
    }
  }

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
            <ContestProgressBar progress={progress} />
          </>
        ) : (
          buttonState.text
        )}
      </Button>
    </div>
  );
};