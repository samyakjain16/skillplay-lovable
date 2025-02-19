
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
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const hasRedirected = useRef(false);

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    return new Date(gameStartTime.getTime() + 30000);
  };

  const updateGameProgress = async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      setGameStartTime(now);

      const { error } = await supabase
        .from('user_contests')
        .update({ 
          current_game_index: currentGameIndex,
          current_game_start_time: now.toISOString()
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating game progress:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update game progress. Please try again.",
        });
      }
    } catch (error) {
      console.error('Error in updateGameProgress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
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
