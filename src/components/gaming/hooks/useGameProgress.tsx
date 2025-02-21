import { useState, useEffect, useCallback } from "react";
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
  syncGameProgress: () => Promise<void>;
}

const GAME_DURATION = 30;
const SYNC_INTERVAL = 5000; // 5 seconds

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
  const [remainingTime, setRemainingTime] = useState<number>(GAME_DURATION);
  const [isContestEnded, setIsContestEnded] = useState(false);

  // Fetch player's completed games with more details
  const { data: completedGames, refetch: refetchCompletedGames } = useQuery({
    queryKey: ["completed-games", contestId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("player_game_progress")
        .select(`
          game_content_id,
          completed_at,
          score
        `)
        .match({
          user_id: user.id,
          contest_id: contestId,
        })
        .order('completed_at', { ascending: true });

      if (error) {
        console.error("Error fetching completed games:", error);
        return [];
      }
      return data?.map(game => game.game_content_id) || [];
    },
    enabled: !!user && !!contestId,
  });

  // Sync game progress with server
  const syncGameProgress = useCallback(async () => {
    if (!user || !contestId) return;

    try {
      const { data: userContest, error } = await supabase
        .from('user_contests')
        .select(`
          current_game_index,
          current_game_start_time,
          current_game_score,
          status
        `)
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (userContest) {
        // Handle game index synchronization
        if (userContest.current_game_index !== currentGameIndex) {
          setCurrentGameIndex(userContest.current_game_index);
        }

        // Handle game start time synchronization
        if (userContest.current_game_start_time) {
          const serverStartTime = new Date(userContest.current_game_start_time);
          const now = new Date();
          const elapsed = (now.getTime() - serverStartTime.getTime()) / 1000;

          // If game has expired on server
          if (elapsed >= GAME_DURATION) {
            setGameStartTime(null);
            setRemainingTime(0);
            // Advance to next game if current game expired
            if (currentGameIndex === userContest.current_game_index) {
              setCurrentGameIndex(currentGameIndex + 1);
            }
          } else {
            // Update local game start time to match server
            setGameStartTime(serverStartTime);
            setRemainingTime(GAME_DURATION - elapsed);
          }
        }
      }

      await refetchCompletedGames();
    } catch (error) {
      console.error('Error syncing game progress:', error);
    }
  }, [user, contestId, currentGameIndex, setCurrentGameIndex, setGameStartTime, refetchCompletedGames]);

  // Effect for contest end check and game timing
  useEffect(() => {
    if (!contest || !contestGames) return;

    const now = new Date();
    const contestEnd = new Date(contest.end_time);

    // Check if contest has ended
    if (now > contestEnd || contest.status === 'completed') {
      setIsContestEnded(true);
      setRemainingTime(0);
      return;
    }

    // Initialize game start time if needed
    if (!gameStartTime) {
      setGameStartTime(new Date());
      setRemainingTime(GAME_DURATION);
      return;
    }

    // Calculate and update remaining time
    const updateRemainingTime = () => {
      const now = new Date();
      const elapsed = (now.getTime() - gameStartTime.getTime()) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setRemainingTime(remaining);
      return remaining;
    };

    // Initial update
    const initialRemaining = updateRemainingTime();
    if (initialRemaining <= 0) {
      return;
    }

    // Set up timer
    const timer = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(timer);
  }, [contest, contestGames, gameStartTime, setGameStartTime]);

  // Effect for periodic sync
  useEffect(() => {
    if (!user || !contestId) return;

    const syncTimer = setInterval(syncGameProgress, SYNC_INTERVAL);
    return () => clearInterval(syncTimer);
  }, [user, contestId, syncGameProgress]);

  return {
    remainingTime,
    GAME_DURATION,
    completedGames,
    isContestEnded,
    syncGameProgress
  };
};