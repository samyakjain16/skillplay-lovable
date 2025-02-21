
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameContainer } from "@/components/gaming/GameContainer";

interface ContestGameSectionProps {
  isCompleted: boolean;
  totalScore: number;
  contestId: string;
  onGameComplete: (score: number, isFinalGame: boolean) => Promise<void>;
  contestProgress: any;
  onReturn: () => void;
}

export const ContestGameSection = ({ 
  isCompleted, 
  totalScore, 
  contestId,
  onGameComplete,
  contestProgress,
  onReturn
}: ContestGameSectionProps) => {
  return (
    <div className="md:col-span-2">
      {isCompleted ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
            <p className="text-lg mb-6">You've completed all games in this contest.</p>
            <p className="text-xl font-semibold mb-8">Final Score: {totalScore}</p>
            <Button onClick={onReturn}>
              Return to Gaming
            </Button>
          </CardContent>
        </Card>
      ) : (
        <GameContainer 
          contestId={contestId}
          onGameComplete={onGameComplete}
          initialProgress={contestProgress}
        />
      )}
    </div>
  );
};
