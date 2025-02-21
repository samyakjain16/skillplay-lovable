import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const GAME_DURATION_MS = 30 * 1000; // 30 seconds

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

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    const endTime = new Date(gameStartTime.getTime() + GAME_DURATION_MS);
    return new Date() > endTime ? null : endTime;
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;

      // Get contest status and user progress in a single query
      const { data, error } = await supabase
        .from('contests')
        .select(`
          status,
          start_time,
          user_contests!inner (
            status,
            current_game_index,
            current_game_start_time,
            completed_games
          )
        `)
        .eq('id', contestId)
        .eq('user_contests.user_id', user.id)
        .single();

      if (error) throw error;
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
      const completedGames = new Set(userContest.completed_games || []);

      // Calculate current game based on elapsed time
      const contestStartTime = new Date(data.start_time);
      const now = new Date();
      const totalElapsedSeconds = Math.floor((now.getTime() - contestStartTime.getTime()) / 1000);
      const timeBasedGameIndex = Math.floor(totalElapsedSeconds / 30);

      // Determine next uncompleted game
      let nextGameIndex = Math.max(timeBasedGameIndex, userContest.current_game_index);

      // Update game state if needed
      if (nextGameIndex !== currentGameIndex || !gameStartTime) {
        setCurrentGameIndex(nextGameIndex);
        const newStartTime = new Date();
        setGameStartTime(newStartTime);

        await supabase
          .from('user_contests')
          .update({
            current_game_index: nextGameIndex,
            current_game_start_time: newStartTime.toISOString()
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);
      }

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update game progress.",
      });
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