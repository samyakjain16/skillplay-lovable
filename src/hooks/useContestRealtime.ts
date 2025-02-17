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

export const useContestRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('contest-changes')
      .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'contests'
        },
        (payload: RealtimePostgresChangesPayload<Contest>) => {
          const newContest = payload.new as Contest;
          if (!newContest?.id) return;

          // Update global contest lists
          queryClient.setQueryData(['my-contests'], (oldData: any) => 
            oldData?.map((item: any) => item.id === newContest.id ? { ...item, ...newContest } : item)
          );

          queryClient.setQueryData(['available-contests'], (oldData: any) => 
            oldData?.map((item: any) => item.id === newContest.id ? { ...item, ...newContest } : item)
          );

          // Update individual contest details
          queryClient.setQueryData(['contest', newContest.id], (oldData: any) => 
            oldData ? { ...oldData, ...newContest } : oldData
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
