
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

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    return new Date(gameStartTime.getTime() + 30000);
  };

  const updateGameProgress = async () => {
    if (!user || !contestId) {
      console.error('Missing user or contest ID');
      return;
    }
    
    try {
      // First, check if the contest is still active
      const { data: contestData, error: contestError } = await supabase
        .from('contests')
        .select('status')
        .eq('id', contestId)
        .single();

      if (contestError) {
        throw new Error('Failed to check contest status');
      }

      if (contestData.status === 'completed') {
        navigate(`/contest/${contestId}/leaderboard`);
        return;
      }

      const now = new Date();
      setGameStartTime(now);

      // Check if user is still part of the contest
      const { data: userContest, error: userContestError } = await supabase
        .from('user_contests')
        .select('status')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      if (userContestError) {
        throw new Error('Failed to check user contest status');
      }

      if (userContest.status === 'completed') {
        navigate('/gaming');
        return;
      }

      const updateData = {
        current_game_index: currentGameIndex,
        current_game_start_time: now.toISOString(),
        status: 'active'
      };

      const { error: updateError } = await supabase
        .from('user_contests')
        .update(updateData)
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update game progress. Please refresh and try again.",
      });
      navigate('/gaming');
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
    toast
  };
};
