
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

      // Get current server-side state
      const { data: userContest, error: userContestError } = await supabase
        .from('user_contests')
        .select('current_game_index, current_game_start_time, status')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      if (userContestError) {
        console.error('Error fetching user contest:', userContestError);
        return;
      }

      // Check if the contest is still active
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .select('status')
        .eq('id', contestId)
        .single();

      if (contestError) {
        console.error('Error fetching contest:', contestError);
        return;
      }

      // Handle completed states
      if (contest.status === 'completed') {
        navigate(`/contest/${contestId}/leaderboard`);
        return;
      }

      if (userContest.status === 'completed') {
        navigate('/gaming');
        return;
      }

      // Sync with server game index
      if (userContest.current_game_index !== currentGameIndex) {
        setCurrentGameIndex(userContest.current_game_index);
      }

      const now = new Date();
      
      // Handle game timing
      if (userContest.current_game_start_time) {
        const serverStartTime = new Date(userContest.current_game_start_time);
        const timeDiff = now.getTime() - serverStartTime.getTime();

        if (timeDiff >= 30000) {
          // Game has expired, trigger end
          gameEndInProgress.current = true;
          return;
        }

        // Use server time
        setGameStartTime(serverStartTime);
        timerInitialized.current = true;
      } else if (!timerInitialized.current) {
        // Only set new start time if timer isn't initialized
        const updateData = {
          current_game_start_time: now.toISOString(),
          status: 'active'
        };

        await supabase
          .from('user_contests')
          .update(updateData)
          .eq('contest_id', contestId)
          .eq('user_id', user.id);

        setGameStartTime(now);
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
