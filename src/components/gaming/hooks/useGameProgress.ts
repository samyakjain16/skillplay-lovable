
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { GameProgress } from "./types/gameProgressTypes";
import { useGameProgressSubscription } from "./useGameProgressSubscription";

export const useGameProgress = (contestId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Set up real-time subscription
  useGameProgressSubscription(contestId, user);

  return useQuery<GameProgress>({
    queryKey: ["game-progress", contestId, user?.id],
    queryFn: async (): Promise<GameProgress> => {
      if (!user) return { count: 0 };

      try {
        // Get completed games count and latest game info in parallel
        const [completedGamesResult, currentGameResult, lastGameResult] = await Promise.all([
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
            .maybeSingle(),
          
          supabase
            .from("player_game_progress")
            .select("game_content_id, completed_at, score")
            .eq("contest_id", contestId)
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (completedGamesResult.error) {
          console.error("Error fetching completed games:", completedGamesResult.error);
          toast({
            variant: "destructive",
            title: "Error fetching game progress",
            description: "Please try refreshing the page"
          });
          throw completedGamesResult.error;
        }

        if (currentGameResult.error && currentGameResult.error.code !== 'PGRST116') {
          console.error("Error fetching current game:", currentGameResult.error);
          toast({
            variant: "destructive",
            title: "Error fetching current game",
            description: "Please try refreshing the page"
          });
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
          lastCompletedGame: lastGameResult.data || undefined,
          currentGameStart: isGameExpired ? null : currentGameResult.data?.current_game_start_time
        };
      } catch (error) {
        console.error("Error in useGameProgress:", error);
        toast({
          variant: "destructive",
          title: "Error fetching game progress",
          description: "Please try refreshing the page"
        });
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 1000,
    gcTime: 30000,
    refetchInterval: (query) => {
      return query.state.data?.currentGameStart ? 1000 : 5000;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export { useDetailedGameProgress } from './useDetailedGameProgress';
