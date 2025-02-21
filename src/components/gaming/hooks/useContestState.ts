
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { GameTimeSlot } from "@/components/contest/types";

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
  const [gameTimeSlot, setGameTimeSlot] = useState<GameTimeSlot | null>(null);
  const hasRedirected = useRef(false);
  const updateInProgress = useRef(false);
  const gameEndInProgress = useRef(false);

  const getGameEndTime = (): Date | null => {
    if (!gameTimeSlot) return null;
    const endTime = new Date(gameTimeSlot.end_time);
    const now = new Date();
    return now > endTime ? null : endTime;
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;

      // Get contest information and user's progress
      const { data, error } = await supabase
        .from('contests')
        .select(`
          status,
          start_time,
          series_count,
          user_contests!inner (
            status,
            current_game_index,
            completed_games
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

      const userContest = data.user_contests[0];
      if (userContest.status === 'completed') {
        navigate('/gaming');
        return;
      }

      // Get completed games
      const completedGames = new Set(userContest.completed_games || []);

      // If current game is completed, move to next game
      if (completedGames.has(contestId + '_' + currentGameIndex)) {
        const nextGameIndex = currentGameIndex + 1;
        if (nextGameIndex < data.series_count) {
          setCurrentGameIndex(nextGameIndex);
          await getOrCreateGameTimeSlot(nextGameIndex);

          await supabase
            .from('user_contests')
            .update({
              current_game_index: nextGameIndex
            })
            .eq('contest_id', contestId)
            .eq('user_id', user.id);
        }
        return;
      }

      // Get or create time slot for current game
      await getOrCreateGameTimeSlot(currentGameIndex);

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
    } finally {
      updateInProgress.current = false;
    }
  };

  const getOrCreateGameTimeSlot = async (gameIndex: number) => {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_game_time_slot', {
          p_contest_id: contestId,
          p_game_index: gameIndex
        });

      if (error) throw error;

      if (data) {
        setGameTimeSlot(data);
        return data;
      }
    } catch (error) {
      console.error('Error getting game time slot:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sync game timer"
      });
    }
  };

  return {
    currentGameIndex,
    setCurrentGameIndex,
    gameTimeSlot,
    setGameTimeSlot,
    hasRedirected,
    getGameEndTime,
    updateGameProgress,
    navigate,
    toast,
    gameEndInProgress
  };
};

