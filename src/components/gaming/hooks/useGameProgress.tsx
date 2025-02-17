
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch player's completed games
  const { data: completedGames } = useQuery({
    queryKey: ["completed-games", contestId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("player_game_progress")
        .select("game_content_id")
        .match({
          user_id: user.id,
          contest_id: contestId,
        });

      if (error) throw error;
      return data?.map(game => game.game_content_id) || [];
    },
    enabled: !!user && !!contestId,
  });

  // Find the next available game index
  const findNextAvailableGameIndex = (startIndex: number) => {
    if (!contestGames || !completedGames) return startIndex;

    for (let i = startIndex; i < contestGames.length; i++) {
      if (!completedGames.includes(contestGames[i].game_content_id)) {
        return i;
      }
    }
    return contestGames.length - 1; // If all games are completed, stay at the last game
  };

  useEffect(() => {
    if (!contest || !contestGames) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const totalElapsedTime = Math.max(0, now.getTime() - contestStart.getTime()) / 1000;
    
    let appropriateGameIndex = Math.min(
      Math.floor(totalElapsedTime / GAME_DURATION),
      contestGames.length - 1
    );

    // Find the next uncompleted game
    appropriateGameIndex = findNextAvailableGameIndex(appropriateGameIndex);

    if (!gameStartTime) {
      // Calculate the exact time into the current game period
      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
      
      // Calculate the exact start time for the current game
      const newStartTime = new Date(now.getTime() - (timeIntoCurrentGame * 1000));
      
      // Only update game index and start time if it's different or not a completed game
      if (appropriateGameIndex !== currentGameIndex) {
        setCurrentGameIndex(appropriateGameIndex);
        setGameStartTime(newStartTime);

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
      }
    } else {
      // For ongoing games, calculate remaining time based on start time
      const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setRemainingTime(remaining);
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, completedGames, toast, setCurrentGameIndex, setGameStartTime]);

  return { remainingTime, GAME_DURATION, completedGames };
};
