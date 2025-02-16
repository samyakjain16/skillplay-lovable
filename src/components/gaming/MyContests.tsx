
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Users, Clock, Award, Hash, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useEffect } from "react";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define the type for contest data
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

// Define the type for participation data
type Participation = {
  id: string;
  user_id: string;
  contest_id: string;
  joined_at: string;
  contest: Contest;
};

export const MyContests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('my-contests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contests'
        },
        (payload: RealtimePostgresChangesPayload<Contest>) => {
          queryClient.setQueryData(['my-contests'], (oldData: Participation[] | undefined) => {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const startContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      const { error } = await supabase
        .from("contests")
        .update({ status: "in_progress" })
        .eq("id", contestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Contest Started!",
        description: "The contest has begun. Good luck!",
      });
      queryClient.invalidateQueries({ queryKey: ["my-contests"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start the contest. Please try again.",
      });
    },
  });

  const { data: contests, isLoading } = useQuery({
    queryKey: ["my-contests"],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("user_contests")
        .select(`
          *,
          contest:contests(*)
        `)
        .eq("user_id", user?.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as Participation[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading your contests...</div>;
  }

  if (!contests || contests.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold">No Contests Yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Join a contest to see it here!
        </p>
      </div>
    );
  }

  const getContestStatus = (contest: any) => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const isFullyBooked = contest.current_participants >= contest.max_participants;
    
    if (contest.status === "in_progress") {
      return {
        text: "In Progress",
        disabled: true,
        variant: "secondary" as const,
      };
    }
    
    if (startTime <= now && isFullyBooked) {
      return {
        text: "Start Contest",
        disabled: false,
        variant: "default" as const,
        action: () => startContestMutation.mutate(contest.id),
        loading: startContestMutation.isPending,
      };
    }
    
    if (startTime <= now) {
      return {
        text: `Waiting for Players (${contest.current_participants}/${contest.max_participants})`,
        disabled: true,
        variant: "secondary" as const,
      };
    }
    
    const timeUntilStart = startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeUntilStart / (1000 * 60));
    
    if (minutesUntilStart <= 30) {
      return {
        text: `Starting in ${minutesUntilStart} minutes`,
        disabled: true,
        variant: "secondary" as const,
      };
    }
    
    return {
      text: `Starts at ${format(startTime, 'h:mm a')}`,
      disabled: true,
      variant: "secondary" as const,
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests?.map((participation) => {
        const totalPrizePool = participation.contest.current_participants * participation.contest.entry_fee;
        const status = getContestStatus(participation.contest);
        
        return (
          <Card key={participation.id} className="w-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{participation.contest.title}</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Players</span>
                    </div>
                    <span>{participation.contest.current_participants}/{participation.contest.max_participants}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span>Prize Pool</span>
                    </div>
                    <span>${totalPrizePool}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span>Distribution</span>
                    </div>
                    <span className="capitalize">{participation.contest.prize_distribution_type}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <span>Series</span>
                    </div>
                    <span>{participation.contest.series_count} Games</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Starts</span>
                    </div>
                    <span>{format(new Date(participation.contest.start_time), 'MMM d, h:mm a')}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full"
                    variant={status.variant}
                    disabled={status.disabled}
                    onClick={status.action}
                  >
                    {status.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      status.text
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
