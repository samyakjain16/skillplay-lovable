import { Card } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";
import { useCallback } from "react";
import { calculateScore } from "@/services/scoring/scoringRules";
import { Loader2 } from "lucide-react";
import { type Game } from "./hooks/types/gameTypes";

interface GameContentProps {
  currentGame: Game;
  currentGameIndex: number;
  totalGames: number;
  gameEndTime: Date | null;
  onGameEnd: (score: number) => void;
}

export const GameContent = ({
  currentGame,
  currentGameIndex,
  totalGames,
  gameEndTime,
  onGameEnd
}: GameContentProps) => {
  
  const handleGameComplete = useCallback(async (
    isCorrect: boolean,
    timeTaken: number,
    additionalData?: Record<string, unknown>
  ) => {
    if (!currentGame?.game_content?.category) {
      console.error('Game content or category is missing');
      onGameEnd(0);
      return;
    }

    // Handle incorrect answers immediately
    if (!isCorrect) {
      onGameEnd(0);
      return;
    }

    try {
      const score = await calculateScore(
        currentGame.game_content.category,
        isCorrect,
        timeTaken
      );
      onGameEnd(score);
    } catch (error) {
      console.error('Error calculating game score:', error);
      onGameEnd(0);
    }
  }, [currentGame?.game_content?.category, onGameEnd]);

  const renderGameContent = (game: Game) => {
    if (!game?.game_content) {
      return <Loader2 className="h-8 w-8 animate-spin" />;
    }

    const content = game.game_content.content as any;

    switch (game.game_content.category) {
      case 'arrange_sort':
        return <ArrangeSortGame 
          content={content as { items: string[]; correctOrder: number[] }}
          onComplete={handleGameComplete} 
        />;
      case 'trivia':
        return <TriviaGame 
          content={content as { question: string; options: string[]; correctAnswer: number }}
          onComplete={handleGameComplete}
        />;
      case 'spot_difference':
        return <SpotDifferenceGame 
          content={content as { image1: string; image2: string; differences: { x: number; y: number; radius: number }[] }}
          onComplete={handleGameComplete}
        />;
      default:
        return <div className="text-center py-8">Unsupported game type</div>;
    }
  };

  if (!currentGame) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Game {currentGameIndex + 1} of {totalGames}
        </h3>
        {gameEndTime && (
          <div className="text-sm font-medium">
            Time Remaining: 
            <CountdownTimer 
              targetDate={gameEndTime} 
              onEnd={() => onGameEnd(0)}
              className="ml-2" 
            />
          </div>
        )}
      </div>

      <div className="min-h-[300px] relative">
        {renderGameContent(currentGame)}
      </div>
    </Card>
  );
};
