
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Contest {
  id: string;
  status: string;
  current_participants: number;
  start_time: string;
  end_time: string;
}

interface Participation {
  contest: Contest;
}

export const useContestRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('contest-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contests'
        },
        (payload: RealtimePostgresChangesPayload<Contest>) => {
          // Update both my-contests and available-contests queries
          ['my-contests', 'available-contests'].forEach(queryKey => {
            queryClient.setQueryData([queryKey], (oldData: Participation[] | undefined) => {
              if (!oldData) return oldData;
              
              const newContest = payload.new as Contest;
              if (!newContest?.id) return oldData;
              
              return oldData.map((participation) => {
                if (participation.contest.id === newContest.id) {
                  return {
                    ...participation,
                    contest: { ...participation.contest, ...newContest }
                  };
                }
                return participation;
              });
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
