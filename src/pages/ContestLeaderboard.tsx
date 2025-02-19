
import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { calculatePrizeDistribution } from "@/services/scoring/prizeDistribution";
import { useToast } from "@/components/ui/use-toast";
import { Trophy } from "lucide-react";

// Define types for our leaderboard data
interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  games_completed: number;
  average_time: number;
  rank: number;
  username?: string | null;
  prize?: number;
}

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: contest } = useQuery({
    queryKey: ["contest", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["contest-leaderboard", id],
    queryFn: async () => {
      if (!contest) return [];

      // Get leaderboard data and user profiles
      const { data: rankings } = await supabase
        .rpc('get_contest_leaderboard', { contest_id: id });

      if (!rankings) return [];

      // Get usernames for the rankings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', rankings.map(r => r.user_id));

      const usernameMap = new Map(
        profiles?.map(p => [p.id, p.username]) || []
      );

      // Calculate prize distribution if contest has ended
      if (contest.status === 'completed' && contest.prize_pool > 0) {
        try {
          const prizes = await calculatePrizeDistribution(
            id!,
            contest.prize_pool,
            contest.prize_distribution_type
          );

          // Combine rankings with usernames and prize information
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
        }
      }

      // Return rankings with usernames but no prizes
      return rankings.map(rank => ({
        ...rank,
        username: usernameMap.get(rank.user_id) || 'Anonymous'
      }));
    },
    enabled: !!contest
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Contest Leaderboard
          </h1>
          {contest && (
            <div className="mb-8">
              <p className="text-muted-foreground">{contest.title}</p>
              {contest.status === 'completed' && contest.prize_pool > 0 && (
                <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 text-primary">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">Total Prize Pool: ${contest.prize_pool}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Rank</th>
                      <th className="text-left py-2">Player</th>
                      <th className="text-right py-2">Score</th>
                      {contest?.status === 'completed' && contest.prize_pool > 0 && (
                        <th className="text-right py-2">Prize</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard?.map((entry) => (
                      <tr key={entry.user_id} className="border-b last:border-0">
                        <td className="py-4">#{entry.rank}</td>
                        <td className="py-4">
                          {entry.username || 'Anonymous'}
                        </td>
                        <td className="py-4 text-right">
                          {entry.total_score.toLocaleString()}
                        </td>
                        {contest?.status === 'completed' && contest.prize_pool > 0 && (
                          <td className="py-4 text-right font-medium">
                            {entry.prize ? `$${entry.prize.toFixed(2)}` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => navigate('/gaming')}
              className="w-full max-w-md"
            >
              Return to Gaming
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContestLeaderboard;
