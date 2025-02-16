
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ContestCard } from "./ContestCard";
import { useContestRealtime } from "@/hooks/useContestRealtime";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  // Set up realtime subscription
  useContestRealtime();

  const startContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      console.log('Starting contest mutation for:', contestId);
      
      // First update the contest status
      const { error: updateError } = await supabase
        .from("contests")
        .update({ status: "in_progress" })
        .eq("id", contestId);

      if (updateError) {
        console.error('Error updating contest status:', updateError);
        throw updateError;
      }

      // Initialize or update user_contests entry
      const { error: userContestError } = await supabase
        .from("user_contests")
        .upsert({
          contest_id: contestId,
          user_id: user?.id,
          status: 'active',
          current_game_index: 0,
          current_game_score: 0
        });

      if (userContestError) {
        console.error('Error updating user contest:', userContestError);
        throw userContestError;
      }

      return contestId;
    },
    onSuccess: (contestId) => {
      toast({
        title: "Contest Started!",
        description: "The contest has begun. Good luck!",
      });
      queryClient.invalidateQueries({ queryKey: ["my-contests"] });
      // Navigate to the contest page
      navigate(`/contest/${contestId}`);
    },
    onError: (error) => {
      console.error('Start contest error:', error);
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

      const now = new Date();

      // First update any contests that should be marked as completed
      const { error: updateError } = await supabase
        .from("contests")
        .update({ status: "completed" })
        .lt("end_time", now.toISOString())
        .neq("status", "completed");

      if (updateError) {
        console.error("Error updating contest statuses:", updateError);
      }

      // Then fetch the contests
      const { data, error } = await supabase
        .from("user_contests")
        .select(`
          *,
          contest:contests(*)
        `)
        .eq("user_id", user?.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      // Update the status of contests that have ended
      const updatedData = data.map((participation: Participation) => {
        const endTime = new Date(participation.contest.end_time);
        if (endTime < now && participation.contest.status !== 'completed') {
          participation.contest.status = 'completed';
        }
        return participation;
      });

      return updatedData as Participation[];
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests.map((participation) => (
        <ContestCard
          key={participation.id}
          contest={participation.contest}
          onStart={(contestId) => {
            console.log('Contest start requested:', contestId);
            startContestMutation.mutate(contestId);
          }}
          isStarting={startContestMutation.isPending}
          isInMyContests={true}
        />
      ))}
    </div>
  );
};
