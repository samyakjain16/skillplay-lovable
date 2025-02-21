
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ContestData, LeaderboardEntry } from "../types";
import { calculatePrizeDistribution } from "@/services/scoring/prizeDistribution";

export const useLeaderboardData = (contest: ContestData | undefined, id: string | undefined) => {
  const { toast } = useToast();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["contest-leaderboard", id],
    queryFn: async () => {
      if (!contest || !id) return [];

      try {
        const { data: rankings, error: rankingsError } = await supabase
          .rpc('get_contest_leaderboard', {
            contest_id: id
          });

        if (rankingsError) {
          console.error('Error fetching rankings:', rankingsError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load rankings"
          });
          throw rankingsError;
        }

        if (!rankings || rankings.length === 0) {
          return [];
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', rankings.map(r => r.user_id));

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load player details"
          });
          throw profilesError;
        }

        const usernameMap = new Map(
          profiles?.map(p => [p.id, p.username]) || []
        );

        if (contest.status === 'completed' && contest.prize_pool > 0) {
          try {
            const prizes = await calculatePrizeDistribution(
              id,
              contest.prize_pool,
              contest.prize_distribution_type
            );

            return rankings.map(rank => ({
              ...rank,
              username: usernameMap.get(rank.user_id) || 'Anonymous',
              prize: prizes.get(rank.user_id) || 0
            }));
          } catch (error) {
            console.error('Error calculating prizes:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to calculate prize distribution"
            });
            return rankings.map(rank => ({
              ...rank,
              username: usernameMap.get(rank.user_id) || 'Anonymous'
            }));
          }
        }

        return rankings.map(rank => ({
          ...rank,
          username: usernameMap.get(rank.user_id) || 'Anonymous'
        }));
      } catch (error) {
        console.error('Error in leaderboard query:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load leaderboard"
        });
        return [];
      }
    },
    enabled: !!contest && !!id,
    refetchInterval: (contest?.status === 'in_progress') ? 5000 : false,
    retry: 3
  });
};
