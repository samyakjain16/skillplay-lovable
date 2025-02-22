
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/realtime-js';
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const lastUpdateRef = useRef<{ [key: string]: number }>({});
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const shouldProcessUpdate = (contestId: string) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[contestId] || 0;
    
    // Implement exponential backoff for high-frequency updates
    const minUpdateInterval = Math.min(200 * Math.pow(2, Object.keys(lastUpdateRef.current).length), 2000);
    
    if (now - lastUpdate < minUpdateInterval) {
      console.log(`Update for contest ${contestId} throttled`);
      return false;
    }
    
    lastUpdateRef.current[contestId] = now;
    return true;
  };

  // Clear update cache periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const newCache: { [key: string]: number } = {};
      
      Object.entries(lastUpdateRef.current).forEach(([contestId, timestamp]) => {
        if (now - timestamp < 60000) { // Keep only last minute of updates
          newCache[contestId] = timestamp;
        }
      });
      
      lastUpdateRef.current = newCache;
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    const updateContestInQueries = async (contestData: Contest) => {
      if (!contestData?.id) return;

      try {
        const now = new Date();
        const endTime = contestData.end_time ? new Date(contestData.end_time) : null;
        const hasEnded = endTime ? now > endTime : false;
        
        const finalContest = {
          ...contestData,
          status: hasEnded ? 'completed' : contestData.status
        };

        console.log('Updating contest data:', finalContest);

        // Batch update both queries
        await queryClient.executeOperation({
          operation: async () => {
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
          }
        });
      } catch (error) {
        console.error('Error updating contest data:', error);
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          // Retry with exponential backoff
          setTimeout(() => {
            updateContestInQueries(contestData);
          }, Math.pow(2, retryCount) * 1000);
        } else {
          toast({
            title: "Update Error",
            description: "Failed to update contest data. Please refresh the page.",
            variant: "destructive"
          });
        }
      }
    };

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

            try {
              // Fetch the latest contest data when a user_contests change occurs
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
              // Handle error appropriately
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
      supabase.removeChannel(channel);
    };
  }, [queryClient, retryCount, toast]);
};
