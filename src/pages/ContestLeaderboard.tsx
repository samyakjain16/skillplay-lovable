
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContestHeader } from "@/components/contest/ContestHeader";
import { LeaderboardTable } from "@/components/contest/LeaderboardTable";
import { useContestData } from "@/components/contest/hooks/useContestData";
import { useLeaderboardData } from "@/components/contest/hooks/useLeaderboardData";

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: contest } = useContestData(id!);
  const { data: leaderboard, isLoading } = useLeaderboardData(contest, id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 p-6">
            {contest && <ContestHeader contest={contest} />}
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <Card>
              <LeaderboardTable 
                entries={leaderboard} 
                showPrizes={contest?.status === 'completed' && (contest?.prize_pool || 0) > 0} 
              />
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No participants yet</p>
            </Card>
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
