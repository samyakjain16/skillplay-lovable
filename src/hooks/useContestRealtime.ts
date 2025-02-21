
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
    
    // Only process updates that are at least 200ms apart
    if (now - lastUpdate < 200) {
      return false;
    }
    
    lastUpdateRef.current[contestId] = now;
    return true;
  };

  useEffect(() => {
    // Function to update contest data in both queries
    const updateContestInQueries = async (contestData: Contest) => {
      if (!contestData?.id) return;

      const now = new Date();
      const endTime = contestData.end_time ? new Date(contestData.end_time) : null;
      const hasEnded = endTime ? now > endTime : false;
      
      const finalContest = {
        ...contestData,
        status: hasEnded ? 'completed' : contestData.status
      };

      console.log('Updating contest data:', finalContest);

      // Update my-contests query
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

      // Update available-contests query
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
    };

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
          console.log('Received contest update:', payload);
          const contestData = payload.new as Contest;
          
          if (!contestData?.id || !shouldProcessUpdate(contestData.id)) return;
          
          await updateContestInQueries(contestData);
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
          const userContest = payload.new as UserContest;
          
          if (!userContest || !userContest.contest_id || !shouldProcessUpdate(userContest.contest_id)) {
            return;
          }

          // Fetch the latest contest data when a user_contests change occurs
          const { data: contestData } = await supabase
            .from('contests')
            .select('*')
            .eq('id', userContest.contest_id)
            .single();

          if (contestData) {
            await updateContestInQueries(contestData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
