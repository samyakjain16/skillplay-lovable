
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ContestCard } from "./ContestCard";
import { useContestRealtime } from "@/hooks/useContestRealtime";

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

  // Set up realtime subscription
  useContestRealtime();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests.map((participation) => (
        <ContestCard
          key={participation.id}
          contest={participation.contest}
          onStart={startContestMutation.mutate}
          isStarting={startContestMutation.isPending}
          isInMyContests={true}
        />
      ))}
    </div>
  );
};
