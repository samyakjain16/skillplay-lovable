
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const useContestState = (
  contestId: string,
  user: User | null,
  initialProgress?: {
    current_game_index: number;
    current_game_start_time: string | null;
    current_game_score: number;
  } | null
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );
  const hasRedirected = useRef(false);
  const updateInProgress = useRef(false);
  const gameEndInProgress = useRef(false);
  const timerInitialized = useRef(false);

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime || timerInitialized.current === false) return null;

    // Calculate the remaining time based on when the game actually started
    const now = new Date();
    const elapsedTime = Math.max(0, Math.floor((now.getTime() - gameStartTime.getTime()) / 1000));
    const remainingTime = Math.max(0, 30 - elapsedTime); // 30 seconds minus elapsed time

    // Return the end time based on current time plus remaining seconds
    return new Date(now.getTime() + (remainingTime * 1000));
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;
      const now = new Date();

      // Get both contest and user_contest status in a single query
      const { data, error } = await supabase
        .from('contests')
        .select(`
          status,
          user_contests!inner (
            status,
            current_game_index,
            current_game_start_time
          )
        `)
        .eq('id', contestId)
        .eq('user_contests.user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking status:', error.message);
        return;
      }

      if (!data) {
        navigate('/gaming');
        return;
      }

      if (data.status === 'completed') {
        navigate(`/contest/${contestId}/leaderboard`);
        return;
      }

      if (data.user_contests[0].status === 'completed') {
        navigate('/gaming');
        return;
      }

      // Set the current game index from the database
      setCurrentGameIndex(data.user_contests[0].current_game_index);

      // Only update game start time if it hasn't been set or if it's a new game
      if (!timerInitialized.current || 
          !data.user_contests[0].current_game_start_time || 
          currentGameIndex !== data.user_contests[0].current_game_index) {
        
        setGameStartTime(now);
        timerInitialized.current = true;

        const updateData = {
          current_game_index: data.user_contests[0].current_game_index,
          current_game_start_time: now.toISOString(),
          status: 'active'
        };

        await supabase
          .from('user_contests')
          .update(updateData)
          .eq('contest_id', contestId)
          .eq('user_id', user.id);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in updateGameProgress:', error.message);
      }
    } finally {
      updateInProgress.current = false;
    }
  };

  return {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    hasRedirected,
    getGameEndTime,
    updateGameProgress,
    navigate,
    toast,
    gameEndInProgress
  };
};
