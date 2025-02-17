
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
    const contestEnd = new Date(contest.end_time);

    // Check if contest has ended
    if (now > contestEnd || contest.status === 'completed') {
      console.log("Contest ended condition met:", { now, contestEnd, status: contest.status });
      setIsContestEnded(true);
      setRemainingTime(0);
      return;
    }

    // If there's no game start time, calculate initial time
    if (!gameStartTime) {
      setGameStartTime(new Date());
      setRemainingTime(GAME_DURATION);
      return;
    }

    // Calculate remaining time for current game
    const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    setRemainingTime(remaining);

    // Set up timer to update remaining time
    const timer = setInterval(() => {
      const newElapsed = (new Date().getTime() - gameStartTime.getTime()) / 1000;
      const newRemaining = Math.max(0, GAME_DURATION - newElapsed);
      setRemainingTime(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [contest, contestGames, gameStartTime, GAME_DURATION, setGameStartTime]);

  return {
    remainingTime,
    GAME_DURATION,
    completedGames,
    isContestEnded
  };
};
