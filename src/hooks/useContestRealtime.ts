
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/realtime-js';

interface Contest {
  id: string;
  status: string;
  current_participants: number;
  start_time: string;
  end_time: string;
  updated_at: string;
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

interface UserContest {
  id: string;
  user_id: string;
  contest_id: string;
  status: string;
  joined_at: string;
}

export const useContestRealtime = () => {
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef<{ [key: string]: number }>({});

  const shouldProcessUpdate = (contestId: string) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[contestId] || 0;
    
    // Only process updates that are at least 500ms apart
    if (now - lastUpdate < 500) {
      return false;
    }
    
    lastUpdateRef.current[contestId] = now;
    return true;
  };

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
        async (payload: RealtimePostgresChangesPayload<Contest>) => {
          const newContest = payload.new as Contest;
          
          if (!newContest?.id || !shouldProcessUpdate(newContest.id)) return;

          console.log('Processing contest update:', payload);

          const now = new Date();
          const endTime = newContest.end_time ? new Date(newContest.end_time) : null;
          const hasEnded = endTime ? now > endTime : false;

          const finalContest = {
            ...newContest,
            status: hasEnded ? 'completed' : newContest.status
          };

          // Update queries synchronously to ensure immediate UI updates
          queryClient.setQueriesData({ queryKey: ['my-contests'] }, (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((participation: MyContestParticipation) => {
              if (participation.contest.id === finalContest.id) {
                return {
                  ...participation,
                  contest: { ...participation.contest, ...finalContest }
                };
              }
              return participation;
            });
          });

          queryClient.setQueriesData({ queryKey: ['available-contests'] }, (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((contest: AvailableContest) => {
              if (contest.id === finalContest.id) {
                return { ...contest, ...finalContest };
              }
              return contest;
            });
          });

          // Force immediate refetch to ensure data consistency
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['my-contests'] }),
            queryClient.invalidateQueries({ queryKey: ['available-contests'] })
          ]);

          // Force immediate refetch
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['my-contests'] }),
            queryClient.refetchQueries({ queryKey: ['available-contests'] })
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_contests'
        },
        async (payload: RealtimePostgresChangesPayload<UserContest>) => {
          console.log('Received user contest update:', payload);
          
          // Force immediate refetch of my-contests
          await queryClient.invalidateQueries({ queryKey: ['my-contests'] });
          await queryClient.refetchQueries({ queryKey: ['my-contests'] });

          // Also refetch available contests to update states
          await queryClient.invalidateQueries({ queryKey: ['available-contests'] });
          await queryClient.refetchQueries({ queryKey: ['available-contests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
