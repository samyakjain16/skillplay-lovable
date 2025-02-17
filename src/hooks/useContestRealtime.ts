
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

interface MyContestParticipation {
  id: string;
  contest: Contest;
}

interface AvailableContest extends Contest {
  description: string;
  title: string;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
  prize_distribution_type: string;
  series_count: number;
}

export const useContestRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Enable REPLICA IDENTITY FULL for contests table to ensure complete row data
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
          console.log('Received contest update:', payload);
          const newContest = payload.new as Contest;
          if (!newContest?.id) return;

          // Update my-contests query data
          queryClient.setQueryData<MyContestParticipation[] | undefined>(
            ['my-contests'], 
            (oldData) => {
              if (!oldData) return oldData;
              return oldData.map((participation) => {
                if (participation.contest.id === newContest.id) {
                  return {
                    ...participation,
                    contest: { ...participation.contest, ...newContest }
                  };
                }
                return participation;
              });
            }
          );

          // Update available-contests query data
          queryClient.setQueryData<AvailableContest[] | undefined>(
            ['available-contests'], 
            (oldData) => {
              if (!oldData) return oldData;
              return oldData.map((contest) => {
                if (contest.id === newContest.id) {
                  return { ...contest, ...newContest };
                }
                return contest;
              });
            }
          );

          // Update single contest query if it exists
          queryClient.setQueryData(
            ['contest', newContest.id],
            (oldData: any) => {
              if (!oldData) return oldData;
              return { ...oldData, ...newContest };
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
