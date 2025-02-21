
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const useGameProgressSubscription = (
  contestId: string,
  user: User | null
) => {
  const queryClient = useQueryClient();

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
        () => {
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
};
