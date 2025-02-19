
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
    
    // Only process updates that are at least 1 second apart
    if (now - lastUpdate < 1000) {
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
        (payload: RealtimePostgresChangesPayload<Contest>) => {
          const newContest = payload.new as Contest;
          const oldContest = payload.old as Partial<Contest>;
          
          if (!newContest?.id || !shouldProcessUpdate(newContest.id)) return;

          console.log('Processing contest update:', payload);

          const now = new Date();
          const endTime = new Date(newContest.end_time);
          const hasEnded = now > endTime || newContest.status === 'completed';

          // If already completed, don't process further updates
          if (oldContest?.status === 'completed' && newContest.status === 'completed') {
            return;
          }

          const finalContest = {
            ...newContest,
            status: hasEnded ? 'completed' : newContest.status
          };

          // Update my-contests query data
          queryClient.setQueryData<MyContestParticipation[] | undefined>(
            ['my-contests'], 
            (oldData) => {
              if (!oldData) return oldData;
              return oldData.map((participation) => {
                if (participation.contest.id === finalContest.id) {
                  // Only update if the status or other relevant fields have changed
                  if (participation.contest.status !== finalContest.status ||
                      participation.contest.current_participants !== finalContest.current_participants) {
                    return {
                      ...participation,
                      contest: { ...participation.contest, ...finalContest }
                    };
                  }
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
                if (contest.id === finalContest.id) {
                  // Only update if there are actual changes
                  if (contest.status !== finalContest.status ||
                      contest.current_participants !== finalContest.current_participants) {
                    return { ...contest, ...finalContest };
                  }
                }
                return contest;
              });
            }
          );

          // If contest has ended or status changed, force refetch
          if (hasEnded || (oldContest && oldContest.status !== finalContest.status)) {
            queryClient.invalidateQueries({ queryKey: ["my-contests"] });
            queryClient.invalidateQueries({ queryKey: ["available-contests"] });
          }

          // Update single contest query if it exists
          queryClient.setQueryData(
            ['contest', finalContest.id],
            (oldData: any) => {
              if (!oldData) return oldData;
              return { ...oldData, ...finalContest };
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_contests'
        },
        (payload: RealtimePostgresChangesPayload<UserContest>) => {
          console.log('Received user contest update:', payload);
          
          // Force immediate refetch of my-contests
          queryClient.invalidateQueries({ queryKey: ['my-contests'] });
          queryClient.refetchQueries({ queryKey: ['my-contests'] });

          // Type guard to ensure payload.new is UserContest
          const newUserContest = payload.new as UserContest;
          if (newUserContest && 'contest_id' in newUserContest) {
            queryClient.invalidateQueries({ 
              queryKey: ['contest', newUserContest.contest_id] 
            });
            // Also refetch available contests to update button states
            queryClient.invalidateQueries({ 
              queryKey: ['available-contests'] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
