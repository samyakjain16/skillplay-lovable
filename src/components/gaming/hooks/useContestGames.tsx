
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContestGames = (contestId: string) => {
  return useQuery({
    queryKey: ["contest-games", contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_games")
        .select(`
          *,
          game_content (*)
        `)
        .eq("contest_id", contestId)
        .order("sequence_number");

      if (error) throw error;
      return data;
    },
  });
};
