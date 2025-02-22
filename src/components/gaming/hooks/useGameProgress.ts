
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GameProgress {
  count: number;
  lastCompletedGame?: {
    game_content_id: string;
    completed_at: string;
    score: number;
  };
  currentGameStart?: string | null;
}

export const useGameProgress = (contestId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["game-progress", contestId, user?.id],
    queryFn: async (): Promise<GameProgress> => {
      if (!user) return { count: 0 };

      // Get completed games count and latest game info in parallel
      const [completedGamesResult, currentGameResult] = await Promise.all([
        supabase
          .from("player_game_progress")
          .select("*", { count: 'exact', head: true })
          .eq("contest_id", contestId)
          .eq("user_id", user.id)
          .not("completed_at", "is", null),
        
        supabase
          .from("user_contests")
          .select("current_game_start_time, current_game_index")
          .eq("contest_id", contestId)
          .eq("user_id", user.id)
          .single(),
        
        supabase
          .from("player_game_progress")
          .select("game_content_id, completed_at, score")
          .eq("contest_id", contestId)
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(1)
      ]);

      // Handle errors
      if (completedGamesResult.error) throw completedGamesResult.error;
      if (currentGameResult.error && currentGameResult.error.code !== 'PGRST116') { // Ignore not found error
        throw currentGameResult.error;
      }

      // Calculate time since last game start
      let isGameExpired = false;
      if (currentGameResult.data?.current_game_start_time) {
        const startTime = new Date(currentGameResult.data.current_game_start_time);
        const now = new Date();
        if (now.getTime() - startTime.getTime() > 30000) { // 30 seconds
          isGameExpired = true;
        }
      }

      return {
        count: completedGamesResult.count || 0,
        lastCompletedGame: completedGamesResult.data?.[0],
        currentGameStart: isGameExpired ? null : currentGameResult.data?.current_game_start_time
      };
    },
    enabled: !!user,
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 30000, // Keep in cache for 30 seconds (replacing cacheTime)
    refetchInterval: (query) => {
      // Refetch more frequently if there's an active game
      return query.state.data?.currentGameStart ? 1000 : 5000;
    }
  });
};

// Helper hook for detailed game progress
export const useDetailedGameProgress = (contestId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["detailed-game-progress", contestId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("player_game_progress")
        .select(`
          game_content_id,
          score,
          time_taken,
          completed_at,
          is_correct
        `)
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true });

      if (error) throw error;

      return data;
    },
    enabled: !!user,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000 // Keep in cache for 5 minutes (replacing cacheTime)
  });
};
