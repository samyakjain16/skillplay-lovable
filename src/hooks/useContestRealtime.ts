
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/realtime-js';
import { Contest, UserContest } from "@/types/contest";
import { UpdateThrottler } from "@/utils/updateThrottling";
import { useContestUpdater } from "./useContestUpdater";

export const useContestRealtime = () => {
  const { updateContestInQueries } = useContestUpdater();
  const throttler = new UpdateThrottler();

  useEffect(() => {
    // Set up cleanup interval for the throttler
    const cleanup = setInterval(() => {
      throttler.cleanup();
    }, 60000);

    // Set up real-time subscription with reconnection handling
    const setupSubscription = () => {
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
            
            if (!contestData?.id || !throttler.shouldProcessUpdate(contestData.id)) return;
            
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
            
            if (!userContest?.contest_id || !throttler.shouldProcessUpdate(userContest.contest_id)) {
              return;
            }

            try {
              const { data: contestData, error } = await supabase
                .from('contests')
                .select('*')
                .eq('id', userContest.contest_id)
                .single();

              if (error) throw error;
              if (contestData) {
                await updateContestInQueries(contestData);
              }
            } catch (error) {
              console.error('Error fetching contest data:', error);
            }
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to contest changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error, attempting to reconnect...');
            await supabase.removeChannel(channel);
            setTimeout(setupSubscription, 1000);
          }
        });

      return channel;
    };

    const channel = setupSubscription();

    return () => {
      clearInterval(cleanup);
      supabase.removeChannel(channel);
    };
  }, []);
};
