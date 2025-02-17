
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

interface GameProgressReturn {
  remainingTime: number;
  GAME_DURATION: number;
  completedGames: string[] | undefined;
  isContestEnded: boolean;
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
}: UseGameProgressProps): GameProgressReturn => {
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const [isContestEnded, setIsContestEnded] = useState(false);
  const GAME_DURATION = 30;

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

      if (error) {
        console.error("Error fetching completed games:", error);
        return [];
      }
      return data?.map(game => game.game_content_id) || [];
    },
    enabled: !!user && !!contestId,
  });

  useEffect(() => {
    if (!contest || !contestGames) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const contestEnd = new Date(contest.end_time);

    // Check if contest has ended
    if (now > contestEnd) {
      setIsContestEnded(true);
      setRemainingTime(0);
      return;
    }

    // Calculate total elapsed time since contest start
    const totalElapsedTime = Math.max(0, now.getTime() - contestStart.getTime()) / 1000;
    
    // Calculate which game we should be on based on elapsed time
    const expectedGameIndex = Math.min(
      Math.floor(totalElapsedTime / GAME_DURATION),
      contestGames.length - 1
    );

    // Find next uncompleted game if current one is completed
    let appropriateGameIndex = expectedGameIndex;
    if (completedGames && completedGames.length > 0) {
      while (
        appropriateGameIndex < contestGames.length && 
        completedGames.includes(contestGames[appropriateGameIndex].game_content_id)
      ) {
        appropriateGameIndex++;
      }
      if (appropriateGameIndex >= contestGames.length) {
        appropriateGameIndex = contestGames.length - 1;
      }
    }

    // If we don't have a game start time, calculate it based on contest progress
    if (!gameStartTime) {
      // Calculate time into current game segment
      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
      
      // Calculate when this game segment started
      const newStartTime = new Date(now.getTime() - (timeIntoCurrentGame * 1000));
      
      if (appropriateGameIndex !== currentGameIndex) {
        setCurrentGameIndex(appropriateGameIndex);
        setGameStartTime(newStartTime);

        // Update progress in database
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
                console.error('Error updating game progress:', error);
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
      // Calculate remaining time based on game start time
      const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setRemainingTime(remaining);
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, completedGames]);

  return {
    remainingTime,
    GAME_DURATION,
    completedGames,
    isContestEnded
  };
};
