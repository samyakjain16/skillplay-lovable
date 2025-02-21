
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface ContestCompletionStateProps {
  totalScore: number;
  onReturnToGaming: () => void;
}

export const ContestCompletionState = ({ totalScore, onReturnToGaming }: ContestCompletionStateProps) => {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
        <p className="text-lg mb-6">You've completed all games in this contest.</p>
        <p className="text-xl font-semibold mb-8">Final Score: {totalScore}</p>
        <Button onClick={onReturnToGaming}>
          Return to Gaming
        </Button>
      </CardContent>
    </Card>
  );
};
