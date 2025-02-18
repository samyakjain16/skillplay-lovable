
import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["contest-leaderboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_contests')
        .select(`
          user_id,
          score,
          status,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('contest_id', id)
        .order('score', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Contest Leaderboard
          </h1>
          {contest && (
            <p className="text-muted-foreground mb-8">{contest.title}</p>
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
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData?.map((entry, index) => (
                      <tr key={entry.user_id} className="border-b last:border-0">
                        <td className="py-4">#{index + 1}</td>
                        <td className="py-4">
                          {entry.profiles?.username || 'Anonymous'}
                        </td>
                        <td className="py-4 text-right">
                          {entry.score.toLocaleString()}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`inline-block px-2 py-1 rounded text-sm ${
                            entry.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
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
