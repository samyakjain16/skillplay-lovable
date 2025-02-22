
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
    console.log('Setting up real-time subscription for contests');
    
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
            
            if (!contestData?.id) {
              console.warn('Received invalid contest data:', contestData);
              return;
            }
            
            if (!throttler.shouldProcessUpdate(contestData.id)) {
              console.log(`Update for contest ${contestData.id} was throttled`);
              return;
            }

            console.log('Processing contest update:', contestData);
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
            
            if (!userContest?.contest_id) {
              console.warn('Received invalid user contest data:', userContest);
              return;
            }
            
            if (!throttler.shouldProcessUpdate(userContest.contest_id)) {
              console.log(`Update for user contest ${userContest.contest_id} was throttled`);
              return;
            }

            try {
              const { data: contestData, error } = await supabase
                .from('contests')
                .select('*')
                .eq('id', userContest.contest_id)
                .single();

              if (error) {
                console.error('Error fetching contest data:', error);
                throw error;
              }
              
              if (contestData) {
                console.log('Processing related contest update:', contestData);
                await updateContestInQueries(contestData);
              }
            } catch (error) {
              console.error('Error processing user contest update:', error);
            }
          }
        )
        .subscribe(async (status) => {
          console.log('Subscription status:', status);
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
      console.log('Cleaning up contest real-time subscription');
      clearInterval(cleanup);
      supabase.removeChannel(channel);
    };
  }, []);
};
