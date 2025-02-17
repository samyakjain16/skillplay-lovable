
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
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (date: Date | null) => void;
}

export const useGameProgress = ({
  user,
  contestId,
  currentGameIndex,
  gameStartTime,
  contestGames,
  contest,
  setCurrentGameIndex,
  setGameStartTime
}: UseGameProgressProps) => {
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const GAME_DURATION = 30; // Game duration in seconds

  useEffect(() => {
    if (!contest || !contestGames) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const totalElapsedTime = Math.max(0, now.getTime() - contestStart.getTime()) / 1000;
    
    const appropriateGameIndex = Math.min(
      Math.floor(totalElapsedTime / GAME_DURATION),
      contestGames.length - 1
    );

    if (!gameStartTime) {
      // If we're joining mid-game, calculate the correct time point
      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
      
      // Calculate the correct start time for the current game
      const newStartTime = new Date(now.getTime() - (timeIntoCurrentGame * 1000));
      setGameStartTime(newStartTime);
      
      // Set the correct game index
      if (appropriateGameIndex !== currentGameIndex) {
        setCurrentGameIndex(appropriateGameIndex);
      }

      // Update database with current game index and start time
      if (user) {
        supabase
          .from('user_contests')
          .update({ 
            current_game_index: appropriateGameIndex,
            current_game_start_time: newStartTime.toISOString()
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
    } else {
      // For ongoing games, calculate remaining time based on start time
      const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setRemainingTime(remaining);
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, toast, setCurrentGameIndex, setGameStartTime]);

  return { remainingTime, GAME_DURATION };
};
