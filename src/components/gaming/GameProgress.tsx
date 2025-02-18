
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GameProgressProps {
  contestId: string;
  isContestFinished: boolean;
}

export const GameProgress = ({ contestId, isContestFinished }: GameProgressProps) => {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-4">Contest Progress</h3>
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
              You've completed all games! The contest is still in progress.
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
