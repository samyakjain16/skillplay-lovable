
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
    if (!gameStartTime) return null;

    // Calculate the original end time (30 seconds from when the game started)
    const originalEndTime = new Date(gameStartTime.getTime() + (30 * 1000));
    
    // If we're past the end time, return null to trigger game end
    if (new Date() > originalEndTime) {
      return null;
    }

    // Return the original end time
    return originalEndTime;
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;

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

      // If there's no start time or it's a new game, initialize it
      if (!timerInitialized.current || 
          !data.user_contests[0].current_game_start_time || 
          currentGameIndex !== data.user_contests[0].current_game_index) {
        
        const serverStartTime = data.user_contests[0].current_game_start_time
          ? new Date(data.user_contests[0].current_game_start_time)
          : new Date();

        setGameStartTime(serverStartTime);
        timerInitialized.current = true;

        // Only update the database if there's no existing start time
        if (!data.user_contests[0].current_game_start_time) {
          const updateData = {
            current_game_index: data.user_contests[0].current_game_index,
            current_game_start_time: serverStartTime.toISOString(),
            status: 'active'
          };

          await supabase
            .from('user_contests')
            .update(updateData)
            .eq('contest_id', contestId)
            .eq('user_id', user.id);
        }
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
