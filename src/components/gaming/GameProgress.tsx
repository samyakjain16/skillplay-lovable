import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface GameProgressProps {
  contestId: string;
  isContestFinished: boolean;
  onRetry?: () => void;
}

export const GameProgress = ({ 
  contestId, 
  isContestFinished,
  onRetry 
}: GameProgressProps) => {
  const navigate = useNavigate();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ["contest-progress", contestId],
    queryFn: async () => {
      const { data: userContest } = await supabase
        .from('user_contests')
        .select(`
          score,
          completed_at,
          contests (
            series_count,
            end_time
          )
        `)
        .eq('contest_id', contestId)
        .single();

      return {
        score: userContest?.score || 0,
        completedAt: userContest?.completed_at,
        totalGames: userContest?.contests?.series_count || 0
      };
    }
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center py-8">
        <h3 className="text-2xl font-semibold mb-4">🎉 Congratulations!</h3>
        <p className="text-lg mb-2">
          You've completed {progressData?.totalGames} games
        </p>
        <p className="text-xl font-medium mb-6">
          Total Score: {progressData?.score}
        </p>
        
        {isContestFinished ? (
          <>
            <p className="text-muted-foreground mb-6">
              Contest has ended. Check out your ranking!
            </p>
            <Button 
              onClick={() => navigate(`/contest/${contestId}/leaderboard`)}
              className="w-full sm:w-auto"
            >
              View Leaderboard
            </Button>
          </>
        ) : progressData?.completedAt ? (
          <>
            <p className="text-muted-foreground mb-6">
              The contest is still in progress.
              Check back when it ends to see your final ranking.
            </p>
            <Button 
              onClick={() => navigate('/gaming')}
              className="w-full sm:w-auto"
            >
              Return to Gaming
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Would you like to try again?
            </p>
            <div className="space-y-3 sm:space-y-0 sm:space-x-3">
              <Button 
                onClick={onRetry}
                className="w-full sm:w-auto"
              >
                Retry Games
              </Button>
              <Button 
                onClick={() => navigate('/gaming')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Return to Gaming
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};