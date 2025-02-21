import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

// Constants
const GAME_DURATION_SECONDS = 30;
const TIMER_UPDATE_INTERVAL = 1000; // 1 second

interface Contest {
  id: string;
  status: 'active' | 'completed';
  end_time: string;
  series_count: number;
}

interface GameContent {
  id: string;
  game_content_id: string;
  // Add other game content fields as needed
}

interface UseGameProgressProps {
  user: User | null;
  contestId: string;
  currentGameIndex: number;
  gameStartTime: Date | null;
  contestGames: GameContent[] | undefined;
  contest: Contest | undefined;
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (date: Date | null) => void;
}

interface GameProgressReturn {
  remainingTime: number;
  gameProgress: number;
  completedGamesCount: number;
  isContestEnded: boolean;
  completedGameIds: string[];
  hasCompletedCurrentGame: boolean;
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
  const [remainingTime, setRemainingTime] = useState(GAME_DURATION_SECONDS);
  const [gameProgress, setGameProgress] = useState(0);
  const [isContestEnded, setIsContestEnded] = useState(false);

  // Fetch completed games using React Query
  const { data: completedGames = [] } = useQuery({
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

      return data || [];
    },
    enabled: !!user && !!contestId,
  });

  // Check contest end status
  const checkContestStatus = useCallback(() => {
    if (!contest) return false;

    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    return now > contestEnd || contest.status === 'completed';
  }, [contest]);

  // Update timers and progress
  useEffect(() => {
    if (!contest || !contestGames || checkContestStatus()) {
      setIsContestEnded(true);
      setRemainingTime(0);
      setGameProgress(100);
      return;
    }

    if (!gameStartTime) {
      setGameStartTime(new Date());
      setRemainingTime(GAME_DURATION_SECONDS);
      setGameProgress(0);
      return;
    }

    const updateTimers = () => {
      const now = new Date();
      const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
      const remaining = Math.max(0, GAME_DURATION_SECONDS - elapsed);
      const progress = Math.min(100, (elapsed / GAME_DURATION_SECONDS) * 100);

      setRemainingTime(remaining);
      setGameProgress(progress);

      return remaining <= 0;
    };

    // Initial update
    const isTimeUp = updateTimers();
    if (isTimeUp) return;

    // Set up interval for updates
    const intervalId = setInterval(() => {
      const isTimeUp = updateTimers();
      if (isTimeUp) {
        clearInterval(intervalId);
      }
    }, TIMER_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [contest, contestGames, gameStartTime, checkContestStatus, setGameStartTime]);

  // Calculate game completion status
  const completedGameIds = completedGames.map(game => game.game_content_id);
  const hasCompletedCurrentGame = contestGames?.[currentGameIndex]
    ? completedGameIds.includes(contestGames[currentGameIndex].game_content_id)
    : false;

  return {
    remainingTime,
    gameProgress,
    completedGamesCount: completedGames.length,
    isContestEnded,
    completedGameIds,
    hasCompletedCurrentGame
  };
};