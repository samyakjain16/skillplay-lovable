
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ContestCard } from "./ContestCard";
import { useContestRealtime } from "@/hooks/useContestRealtime";
import { useNavigate } from "react-router-dom";
import { type Contest } from "./ContestTypes";

type Participation = {
  id: string;
  user_id: string;
  contest_id: string;
  joined_at: string;
  contest: Contest;
  status: string;
  completed_at?: string;
  current_game_index: number;
  current_game_score: number;
  current_game_start_time?: string;
  score: number;
};

export const MyContests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Set up real-time subscription
  useContestRealtime();

  const startContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      console.log("Starting contest for:", contestId);

      if (!user?.id) throw new Error("User not authenticated");

      const { error: updateError } = await supabase
        .from("contests")
        .update({ status: "in_progress" })
        .eq("id", contestId);

      if (updateError) throw updateError;

      const { data: existingEntry, error: fetchError } = await supabase
        .from("user_contests")
        .select("*")
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const { error: userContestError } = await supabase
        .from("user_contests")
        .upsert(
          {
            id: existingEntry?.id,
            contest_id: contestId,
            user_id: user.id,
            status: "active",
            current_game_index: 0,
            current_game_score: 0,
            ...(existingEntry ? {} : { joined_at: new Date().toISOString() }),
          },
          { onConflict: "user_id,contest_id" }
        );

      if (userContestError) throw userContestError;

      return contestId;
    },
    onSuccess: (contestId) => {
      toast({ title: "Contest Started!", description: "Good luck!" });
      queryClient.invalidateQueries({ queryKey: ["my-contests"] });
      navigate(`/contest/${contestId}`);
    },
    onError: (error: Error) => {
      console.error("Start contest error:", error);
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
      if (!user?.id) return [];

      const now = new Date();

      // Update status of contests that should be in progress
      const { error: updateError } = await supabase
        .from("contests")
        .update({ status: "in_progress" })
        .lt("start_time", now.toISOString())
        .gt("end_time", now.toISOString())
        .eq("status", "upcoming");

      if (updateError) console.error("Error updating contest statuses:", updateError);

      // Update status of completed contests
      const { error: completeError } = await supabase
        .from("contests")
        .update({ status: "completed" })
        .lt("end_time", now.toISOString())
        .neq("status", "completed");

      if (completeError) console.error("Error updating completed contests:", completeError);

      const { data, error } = await supabase
        .from("user_contests")
        .select("*, contest:contests(*)")
        .eq("user_id", user?.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      return data.map((participation: any) => ({
        ...participation,
        contest: {
          ...participation.contest,
          status: participation.contest.status as Contest['status'],
          contest_type: participation.contest.contest_type as Contest['contest_type'],
          prize_calculation_status: participation.contest.prize_calculation_status || 'pending'
        }
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds to check for status updates
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  if (isLoading) return <div>Loading your contests...</div>;

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

  const handleStartContest = async (contestId: string): Promise<void> => {
    await startContestMutation.mutateAsync(contestId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests.map((participation) => (
        <ContestCard
          key={participation.id}
          contest={participation.contest}
          onStart={handleStartContest}
          isStarting={startContestMutation.isPending}
          isInMyContests={true}
        />
      ))}
    </div>
  );
};
