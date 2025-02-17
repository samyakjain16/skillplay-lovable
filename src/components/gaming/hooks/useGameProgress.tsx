
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UseGameProgressProps {
  user: User | null;
  contestId: string;
  currentGameIndex: number;
  gameStartTime: Date | null;
  contestGames: any[] | undefined;
  contest: any;
}

export const useGameProgress = ({
  user,
  contestId,
  currentGameIndex,
  gameStartTime,
  contestGames,
  contest
}: UseGameProgressProps) => {
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const GAME_DURATION = 30; // Game duration in seconds

  useEffect(() => {
    if (!contest || !contestGames || gameStartTime) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const totalElapsedTime = Math.max(0, now.getTime() - contestStart.getTime()) / 1000;
    
    const appropriateGameIndex = Math.min(
      Math.floor(totalElapsedTime / GAME_DURATION),
      contestGames.length - 1
    );

    if (appropriateGameIndex === currentGameIndex) {
      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
    } else {
      setRemainingTime(GAME_DURATION);
    }

    if (user && appropriateGameIndex !== currentGameIndex) {
      supabase
        .from('user_contests')
        .update({ 
          current_game_index: appropriateGameIndex,
          current_game_start_time: new Date().toISOString()
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating game index:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to update game progress"
            });
          }
        });
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, toast]);

  return { remainingTime, GAME_DURATION };
};
