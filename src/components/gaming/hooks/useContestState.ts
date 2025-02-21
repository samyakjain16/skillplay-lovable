
import { useState, useRef, useEffect } from "react";
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

  // Function to calculate remaining time for a game
  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    const endTime = new Date(gameStartTime.getTime() + 30000); // 30 seconds from start
    const now = new Date();
    
    if (now > endTime) {
      return null;
    }
    return endTime;
  };

  // Function to handle automatic game progression when timer ends
  const autoProgressGame = async () => {
    if (gameEndInProgress.current) return;
    gameEndInProgress.current = true;

    try {
      const { data: contest } = await supabase
        .from('contests')
        .select('series_count')
        .eq('id', contestId)
        .single();

      if (!contest) return;

      const nextGameIndex = currentGameIndex + 1;
      
      // If this was the last game
      if (nextGameIndex >= contest.series_count) {
        const now = new Date().toISOString();
        await supabase
          .from('user_contests')
          .update({
            status: 'completed',
            completed_at: now,
            current_game_start_time: null,
            current_game_index: currentGameIndex
          })
          .eq('contest_id', contestId)
          .eq('user_id', user?.id);

        navigate('/gaming');
        return;
      }

      // Progress to next game
      const now = new Date();
      await supabase
        .from('user_contests')
        .update({
          current_game_index: nextGameIndex,
          current_game_start_time: now.toISOString(),
          current_game_score: 0
        })
        .eq('contest_id', contestId)
        .eq('user_id', user?.id);

      setCurrentGameIndex(nextGameIndex);
      setGameStartTime(now);
      timerInitialized.current = true;
    } catch (error) {
      console.error('Error in auto progress:', error);
    } finally {
      gameEndInProgress.current = false;
    }
  };

  // Effect to handle timer expiration
  useEffect(() => {
    if (!gameStartTime || !user) return;

    const endTime = getGameEndTime();
    if (!endTime) return;

    const timeoutId = setTimeout(() => {
      autoProgressGame();
    }, endTime.getTime() - new Date().getTime());

    return () => clearTimeout(timeoutId);
  }, [gameStartTime, user, contestId, currentGameIndex]);

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
        .maybeSingle();

      if (userContestError || !userContest) {
        console.error('Error fetching user contest:', userContestError);
        return;
      }

      // If contest is completed, redirect to appropriate screen
      if (userContest.status === 'completed') {
        navigate('/gaming');
        return;
      }

      // Sync with server game index
      if (userContest.current_game_index !== currentGameIndex) {
        setCurrentGameIndex(userContest.current_game_index);
      }

      // Handle game timing
      if (userContest.current_game_start_time) {
        const serverStartTime = new Date(userContest.current_game_start_time);
        const now = new Date();
        const timeDiff = now.getTime() - serverStartTime.getTime();

        // If time has expired, trigger auto-progress
        if (timeDiff >= 30000) {
          autoProgressGame();
          return;
        }

        // Use server time
        setGameStartTime(serverStartTime);
        timerInitialized.current = true;
      } else if (!timerInitialized.current) {
        // Start new game timer
        const now = new Date();
        await supabase
          .from('user_contests')
          .update({
            current_game_start_time: now.toISOString(),
            status: 'active',
            current_game_index: userContest.current_game_index
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);

        setGameStartTime(now);
        timerInitialized.current = true;
      }

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
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
