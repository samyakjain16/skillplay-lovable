import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const GAME_DURATION_MS = 30 * 1000; // 30 seconds in milliseconds

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

    const now = new Date();
    const originalEndTime = new Date(gameStartTime.getTime() + GAME_DURATION_MS);
    
    // If we're past the end time, return null to trigger game end
    if (now > originalEndTime) {
      return null;
    }

    // Return the actual remaining time
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
            current_game_start_time,
            current_game_score
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

      // Handle contest completion states
      if (data.status === 'completed') {
        navigate(`/contest/${contestId}/leaderboard`);
        return;
      }

      if (data.user_contests[0].status === 'completed') {
        navigate('/gaming');
        return;
      }

      const userContest = data.user_contests[0];
      
      // Update current game index from server
      setCurrentGameIndex(userContest.current_game_index);

      // Handle game start time synchronization
      if (!timerInitialized.current || 
          !userContest.current_game_start_time || 
          currentGameIndex !== userContest.current_game_index) {
        
        let newStartTime: Date;
        
        if (userContest.current_game_start_time) {
          // For late-joining players, use the existing start time
          newStartTime = new Date(userContest.current_game_start_time);
          
          // If the game should have ended already, trigger immediate end
          const now = new Date();
          const endTime = new Date(newStartTime.getTime() + GAME_DURATION_MS);
          if (now > endTime && !gameEndInProgress.current) {
            gameEndInProgress.current = true;
            // End the game with the saved score or 0
            const finalScore = userContest.current_game_score || 0;
            setGameStartTime(null);
            return finalScore;
          }
        } else {
          newStartTime = new Date();

          
          // Update the start time in the database
          await supabase
            .from('user_contests')
            .update({
              current_game_index: userContest.current_game_index,
              current_game_start_time: newStartTime.toISOString(),
              status: 'active'
            })
            .eq('contest_id', contestId)
            .eq('user_id', user.id);
        }

        setGameStartTime(newStartTime);
        timerInitialized.current = true;
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