import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Constants
const GAME_DURATION_MS = 30000; // 30 seconds

interface ContestProgress {
  current_game_index: number;
  current_game_start_time: string | null;
  current_game_score: number;
  status: 'active' | 'completed';
}

interface ContestData {
  series_count: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed';
}

export const useContestState = (
  contestId: string,
  user: User | null,
  initialProgress?: ContestProgress | null
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [currentGameIndex, setCurrentGameIndex] = useState(
    initialProgress?.current_game_index ?? 0
  );
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );

  // Refs for operation locks and status
  const operationLocks = useRef({
    update: false,
    gameEnd: false,
    timerInitialized: false,
    hasRedirected: false
  });

  // Get appropriate game index based on elapsed time
  const getAppropriateGameIndex = async (): Promise<number | null> => {
    try {
      const { data: contest } = await supabase
        .from('contests')
        .select('start_time, series_count, status')
        .eq('id', contestId)
        .single();

      if (!contest || contest.status === 'completed') return null;

      const startTime = new Date(contest.start_time);
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      const appropriateIndex = Math.floor(elapsedMs / GAME_DURATION_MS);

      return Math.min(appropriateIndex, contest.series_count - 1);
    } catch (error) {
      console.error('Error calculating appropriate game index:', error);
      return null;
    }
  };

  // Calculate remaining time for current game
  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    const endTime = new Date(gameStartTime.getTime() + GAME_DURATION_MS);
    return new Date() > endTime ? null : endTime;
  };

  // Update game progress on server and handle state changes
  const updateGameProgress = async () => {
    if (!user || !contestId || operationLocks.current.update || operationLocks.current.gameEnd) {
      return;
    }

    try {
      operationLocks.current.update = true;

      // Get current server states
      const [{ data: userContest }, { data: contest }] = await Promise.all([
        supabase
          .from('user_contests')
          .select('current_game_index, current_game_start_time, status')
          .eq('contest_id', contestId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('contests')
          .select('series_count, status, start_time, end_time')
          .eq('id', contestId)
          .single()
      ]);

      if (!contest || !userContest) {
        throw new Error('Contest or user progress not found');
      }

      // Handle completed states
      if (contest.status === 'completed' || userContest.status === 'completed') {
        if (!operationLocks.current.hasRedirected) {
          operationLocks.current.hasRedirected = true;
          navigate('/gaming');
        }
        return;
      }

      // For new or returning players, calculate appropriate game
      if (!userContest.current_game_start_time) {
        const appropriateIndex = await getAppropriateGameIndex();
        if (appropriateIndex === null) return;

        const now = new Date();
        await supabase
          .from('user_contests')
          .upsert({
            contest_id: contestId,
            user_id: user.id,
            current_game_index: appropriateIndex,
            current_game_start_time: now.toISOString(),
            status: 'active'
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);

        setCurrentGameIndex(appropriateIndex);
        setGameStartTime(now);
        operationLocks.current.timerInitialized = true;
        return;
      }

      // Sync with server game index
      if (userContest.current_game_index !== currentGameIndex) {
        setCurrentGameIndex(userContest.current_game_index);
      }

      // Handle game timing
      const serverStartTime = new Date(userContest.current_game_start_time);
      const timeDiff = Date.now() - serverStartTime.getTime();

      // If current game has expired
      if (timeDiff >= GAME_DURATION_MS) {
        const nextIndex = userContest.current_game_index + 1;
        
        // Check if this was the last game
        if (nextIndex >= contest.series_count) {
          await supabase
            .from('user_contests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              current_game_start_time: null
            })
            .eq('contest_id', contestId)
            .eq('user_id', user.id);

          if (!operationLocks.current.hasRedirected) {
            operationLocks.current.hasRedirected = true;
            navigate('/gaming');
          }
          return;
        }

        // Progress to next game
        const now = new Date();
        await supabase
          .from('user_contests')
          .update({
            current_game_index: nextIndex,
            current_game_start_time: now.toISOString(),
            current_game_score: 0
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);

        setCurrentGameIndex(nextIndex);
        setGameStartTime(now);
        operationLocks.current.timerInitialized = true;
      } else {
        // Use server time for consistency
        setGameStartTime(serverStartTime);
        operationLocks.current.timerInitialized = true;
      }

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update game progress. Please refresh the page.",
      });
    } finally {
      operationLocks.current.update = false;
    }
  };

  // Effect to handle automatic progress check
  useEffect(() => {
    if (!user || !contestId) return;

    // Initial progress check
    updateGameProgress();

    // Set up regular progress checks
    const intervalId = setInterval(updateGameProgress, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [user, contestId]);

  return {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    operationLocks,
    getGameEndTime,
    updateGameProgress,
    navigate,
    toast
  };
};