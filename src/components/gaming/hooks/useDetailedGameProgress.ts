
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";
import { DetailedGameProgress } from "./types/gameProgressTypes";
import { useGameProgressSubscription } from "./useGameProgressSubscription";

export const useDetailedGameProgress = (contestId: string, user: User | null) => {
  const { toast } = useToast();

  // Set up real-time subscription
  useGameProgressSubscription(contestId, user);

  return useQuery<DetailedGameProgress[]>({
    queryKey: ["detailed-game-progress", contestId, user?.id],
    queryFn: async () => {
      if (!user) return [];

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
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
