
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTimeStatus } from "./utils/contestButtonUtils";
import { ContestProgressBar } from "./ContestProgressBar";
import { type Contest } from "./ContestTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContestButtonStatus } from "@/services/scoring/types";

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
  const [buttonStatus, setButtonStatus] = useState<ContestButtonStatus>('join_contest');
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
          status,
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
      
      // If contest is completed, update button status
      if (contestData[0].status === 'completed') {
        setButtonStatus('view_leaderboard');
        return;
      }
      
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
        
        // Update button status based on game number
        const remainingGames = contest.series_count - completedGames.length;
        if (remainingGames === 0) {
          setButtonStatus('games_completed');
        } else {
          setButtonStatus('continue_game');
        }
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
        
        if (isInMyContests) {
          setButtonStatus('view_leaderboard');
        }
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
  }, [contest.status, contest.id, contest.start_time, contest.end_time, queryClient, isInMyContests]);
  
  // Effect to determine button status based on contest state
  useEffect(() => {
    // Non-joined contests
    if (!isInMyContests) {
      if (contest.current_participants >= contest.max_participants) {
        setButtonStatus('contest_full');
      } else {
        setButtonStatus('join_contest');
      }
      return;
    }
    
    // Joined contests
    if (userCompletedGames) {
      setButtonStatus('games_completed');
    } else if (contest.status === 'completed') {
      setButtonStatus('view_leaderboard');
    } else if (contest.status === 'in_progress') {
      if (currentGameNumber) {
        setButtonStatus('continue_game');
      } else {
        // Default for in-progress contests
        setButtonStatus('continue_game');
      }
    } else if (contest.status === 'waiting_for_players') {
      setButtonStatus('waiting_for_players');
    } else {
      // Default for other statuses
      setButtonStatus(contest.status === 'upcoming' ? 'join_contest' : 'view_leaderboard');
    }
  }, [contest.status, contest.current_participants, contest.max_participants, isInMyContests, userCompletedGames, currentGameNumber]);

  const handleClick = async () => {
    if (loading || buttonState.disabled) return;
    
    setLocalLoading(true);
    try {
      await onClick?.();
    } finally {
      setLocalLoading(false);
    }
  };

  // Button text mapper
  const getButtonText = (): string => {
    switch (buttonStatus) {
      case 'join_contest':
        return contest.contest_type === 'fixed_participants' 
          ? `Join (${contest.current_participants}/${contest.max_participants})` 
          : "Join Contest";
      case 'waiting_for_players':
        return `Waiting for Players (${contest.current_participants}/${contest.max_participants})`;
      case 'continue_game':
        return currentGameNumber 
          ? `Continue Game ${currentGameNumber}/${contest.series_count}`
          : "Continue Playing";
      case 'games_completed':
        return "Games Completed";
      case 'view_leaderboard':
        return "View Leaderboard";
      case 'contest_full':
        return "Contest Full";
      case 'finalizing_results':
        return "Finalizing Results...";
      case 'starting_countdown':
        return "Starting Soon...";
      default:
        return "Join Contest";
    }
  };

  // Button style and state mapper
  const getButtonState = () => {
    const styles = {
      disabled: false,
      showProgress: contest.status === "in_progress",
      customClass: "bg-green-500 hover:bg-green-600 text-white"
    };

    switch (buttonStatus) {
      case 'join_contest':
        styles.customClass = "bg-green-500 hover:bg-green-600 text-white";
        break;
      case 'waiting_for_players':
        styles.disabled = true;
        styles.customClass = "bg-gray-400 text-white cursor-not-allowed";
        break;
      case 'continue_game':
        styles.customClass = "bg-blue-500 hover:bg-blue-600 text-white";
        break;
      case 'games_completed':
        styles.disabled = true;
        styles.customClass = "bg-blue-600 text-white";
        break;
      case 'view_leaderboard':
        styles.customClass = "bg-gray-600 hover:bg-gray-700 text-white";
        break;
      case 'contest_full':
        styles.disabled = true;
        styles.customClass = "bg-gray-600 text-white";
        break;
      case 'finalizing_results':
        styles.disabled = true;
        styles.customClass = "bg-amber-500 text-white";
        break;
      case 'starting_countdown':
        styles.disabled = true;
        styles.customClass = "bg-amber-500 text-white";
        break;
      default:
        styles.customClass = "bg-green-500 hover:bg-green-600 text-white";
    }

    return styles;
  };

  const buttonText = getButtonText();
  const buttonState = getButtonState();

  return (
    <div className="relative w-full">
      <Button 
        className={`w-full relative overflow-hidden transition-all duration-500 ${buttonState.customClass}`}
        variant="default"
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
            <span className="relative z-10">{buttonText}</span>
            <ContestProgressBar progress={progress} />
          </>
        ) : (
          <>
            {buttonStatus === 'waiting_for_players' && <Clock className="mr-2 h-4 w-4" />}
            {buttonStatus === 'games_completed' && <CheckCircle className="mr-2 h-4 w-4" />}
            {buttonText}
          </>
        )}
      </Button>
    </div>
  );
};
