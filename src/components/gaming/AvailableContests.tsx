
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

export const AvailableContests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up real-time subscription
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
          // Update the cache with the new data
          queryClient.setQueryData(['available-contests'], (oldData: Contest[] | undefined) => {
            if (!oldData) return oldData;
            
            // If it's a DELETE, remove the contest
            if (payload.eventType === 'DELETE') {
              return oldData.filter((contest) => contest.id !== payload.old.id);
            }
            
            // For INSERT or UPDATE, update the contest data
            const updatedContests = oldData.map((contest) => {
              if (contest.id === payload.new.id) {
                return { ...contest, ...payload.new };
              }
              return contest;
            });
            
            // If it's an INSERT and the contest wasn't found in the map
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

  // Query to get user's joined contests
  const { data: joinedContests } = useQuery({
    queryKey: ["joined-contests"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_contests")
        .select("contest_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(uc => uc.contest_id);
    },
    enabled: !!user
  });

  const { data: contests, isLoading } = useQuery({
    queryKey: ["available-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "upcoming")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const joinContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Start transaction
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("entry_fee, current_participants, max_participants")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;
      
      // Check if contest is full
      if (contest.current_participants >= contest.max_participants) {
        throw new Error("Contest is full");
      }

      // Check wallet balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (profile.wallet_balance < contest.entry_fee) {
        throw new Error("Insufficient balance");
      }

      // Create participation record
      const { error: participationError } = await supabase
        .from("user_contests")
        .insert([{ user_id: user.id, contest_id: contestId }]);

      if (participationError) {
        // Check if user already joined
        if (participationError.code === '23505') { // Unique violation
          throw new Error("You have already joined this contest");
        }
        throw participationError;
      }

      // Update contest participants count
      const { error: updateError } = await supabase
        .from("contests")
        .update({ current_participants: contest.current_participants + 1 })
        .eq("id", contestId);

      if (updateError) throw updateError;

      // Create wallet transaction
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert([{
          user_id: user.id,
          amount: -contest.entry_fee,
          type: "contest_entry",
          reference_id: contestId,
        }]);

      if (transactionError) throw transactionError;

      // Update user's wallet balance
      const { error: walletError } = await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - contest.entry_fee })
        .eq("id", user.id);

      if (walletError) throw walletError;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["joined-contests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      // Invalidate queries to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["joined-contests"] });
    },
  });

  if (isLoading) {
    return <div>Loading contests...</div>;
  }

  // Filter out contests that the user has already joined
  const availableContests = contests?.filter(contest => 
    !joinedContests?.includes(contest.id)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableContests?.map((contest) => {
        const totalPrizePool = contest.current_participants * contest.entry_fee;
        const isJoining = joinContestMutation.isPending;
        
        return (
          <Card key={contest.id} className="w-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{contest.title}</h3>
                  <p className="text-sm text-muted-foreground">{contest.description}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Players</span>
                    </div>
                    <span>{contest.current_participants}/{contest.max_participants}</span>
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
                    <span className="capitalize">{contest.prize_distribution_type}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <span>Series</span>
                    </div>
                    <span>{contest.series_count} Games</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Starts</span>
                    </div>
                    <span>{format(new Date(contest.start_time), 'MMM d, h:mm a')}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full"
                    onClick={() => joinContestMutation.mutate(contest.id)}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      `Join for $${contest.entry_fee}`
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
