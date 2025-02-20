
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
    const endTime = new Date(gameStartTime.getTime() + 30000); // 30 seconds from start
    const now = new Date();
    
    // If the game has already ended, return null to trigger game end
    if (now > endTime) {
      return null;
    }
    return endTime;
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;
      const now = new Date();

      // Use a single query to get both contest and user_contest status
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

      const serverGameStartTime = data.user_contests[0].current_game_start_time;
      
      if (serverGameStartTime) {
        const serverStartDate = new Date(serverGameStartTime);
        const timeDiff = now.getTime() - serverStartDate.getTime();
        
        // If more than 30 seconds have passed since server start time,
        // move to the next game with score 0
        if (timeDiff >= 30000) {
          console.log("Game time expired based on server time");
          gameEndInProgress.current = true;
          // This will trigger handleGameEnd with score 0
          return;
        }
        
        // Use server's start time if it exists
        setGameStartTime(serverStartDate);
        timerInitialized.current = true;
      } else if (!timerInitialized.current || currentGameIndex !== data.user_contests[0].current_game_index) {
        // Only set new start time if timer isn't initialized or it's a new game
        setCurrentGameIndex(data.user_contests[0].current_game_index);
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
