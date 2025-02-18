
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useGameProgress = (contestId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["completed-games", contestId, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("player_game_progress")
        .select("*", { count: 'exact', head: true })
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .not("completed_at", "is", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user
  });
};
