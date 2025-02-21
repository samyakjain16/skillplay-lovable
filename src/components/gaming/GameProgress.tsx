
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface GameProgressProps {
  contestId: string;
  isContestFinished: boolean;
}

export const GameProgress = ({ contestId, isContestFinished }: GameProgressProps) => {
  const navigate = useNavigate();

  const { data: contestScore, isLoading } = useQuery({
    queryKey: ["contest-score", contestId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_contests')
        .select('score')
        .eq('contest_id', contestId)
        .single();
      return data?.score || 0;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center py-8">
        <h3 className="text-2xl font-semibold mb-4">🎉 Congratulations!</h3>
        <p className="text-lg mb-2">You've completed all games</p>
        <p className="text-xl font-medium mb-6">Your Score: {contestScore}</p>
        
        {isContestFinished ? (
          <>
            <p className="text-muted-foreground mb-6">Contest has ended. View the final results!</p>
            <Button onClick={() => navigate(`/contest/${contestId}/leaderboard`)}>
              View Leaderboard
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              The contest is still in progress.
              Check back when it ends to see the final results.
            </p>
            <Button onClick={() => navigate('/gaming')}>
              Return to Gaming
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
