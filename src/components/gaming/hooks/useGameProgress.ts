
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up real-time subscription for game progress updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('game-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_progress',
          filter: `user_id=eq.${user.id} AND contest_id=eq.${contestId}`
        },
        (payload) => {
          // Invalidate queries to trigger a refetch
          queryClient.invalidateQueries({
            queryKey: ["game-progress", contestId, user.id]
          });
          queryClient.invalidateQueries({
            queryKey: ["detailed-game-progress", contestId, user.id]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contestId, queryClient]);

  return useQuery({
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

        // Detailed error handling with user feedback
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
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 30000, // Keep in cache for 30 seconds
    refetchInterval: (query) => {
      // Refetch more frequently if there's an active game
      return query.state.data?.currentGameStart ? 1000 : 5000;
    },
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Helper hook for detailed game progress
export const useDetailedGameProgress = (contestId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for detailed game progress updates
    const channel = supabase
      .channel('detailed-game-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_game_progress',
          filter: `user_id=eq.${user.id} AND contest_id=eq.${contestId}`
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: ["detailed-game-progress", contestId, user.id]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contestId, queryClient]);

  return useQuery({
    queryKey: ["detailed-game-progress", contestId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      try {
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

        if (error) {
          console.error("Error fetching detailed game progress:", error);
          toast({
            variant: "destructive",
            title: "Error fetching game details",
            description: "Please try refreshing the page"
          });
          throw error;
        }

        return data;
      } catch (error) {
        console.error("Error in useDetailedGameProgress:", error);
        toast({
          variant: "destructive",
            title: "Error fetching game details",
            description: "Please try refreshing the page"
        });
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
