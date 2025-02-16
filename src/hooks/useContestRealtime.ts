
import { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Contest = {
  id: string;
  title: string;
  description: string;
  series_count: number;
  max_participants: number;
  current_participants: number;
  status: string;
  start_time: string;
  end_time: string;
  prize_pool: number;
  entry_fee: number;
  prize_distribution_type: string;
};

export const useContestRealtime = (queryClient: QueryClient) => {
  useEffect(() => {
    const channel = supabase
      .channel('contests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contests'
        },
        (payload: RealtimePostgresChangesPayload<Contest>) => {
          queryClient.setQueryData(['available-contests'], (oldData: Contest[] | undefined) => {
            if (!oldData) return oldData;
            
            if (payload.eventType === 'DELETE') {
              return oldData.filter((contest) => contest.id !== payload.old.id);
            }
            
            const updatedContests = oldData.map((contest) => {
              if (contest.id === payload.new.id) {
                return { ...contest, ...payload.new };
              }
              return contest;
            });
            
            if (payload.eventType === 'INSERT' && !updatedContests.find((c) => c.id === payload.new.id)) {
              updatedContests.push(payload.new);
            }
            
            return updatedContests;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
