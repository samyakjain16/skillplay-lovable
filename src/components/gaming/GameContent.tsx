
import { Card } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";
import { useEffect } from "react";
import { calculateGameScore } from "@/services/scoring/scoringRules";

interface GameContentProps {
  currentGame: any;
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
  // Effect to handle game end when component unmounts or game changes
  useEffect(() => {
    if (gameEndTime) {
      const timeUntilEnd = new Date(gameEndTime).getTime() - new Date().getTime();
      if (timeUntilEnd > 0) {
        const timeout = setTimeout(() => {
          onGameEnd(0);
        }, timeUntilEnd);
        return () => clearTimeout(timeout);
      }
    }
  }, [gameEndTime, onGameEnd]);

  const handleGameComplete = async (
    isCorrect: boolean,
    timeTaken: number,
    additionalData?: Record<string, any>
  ) => {
    try {
      const score = await calculateGameScore(
        currentGame.game_content.category,
        isCorrect,
        timeTaken,
        additionalData
      );
      onGameEnd(score);
    } catch (error) {
      console.error('Error calculating game score:', error);
      onGameEnd(0);
    }
  };

  const renderGameContent = (game: any) => {
    switch (game.game_content.category) {
      case 'arrange_sort':
        return (
          <ArrangeSortGame
            content={game.game_content.content}
            onComplete={(isCorrect, timeTaken) => handleGameComplete(isCorrect, timeTaken)}
          />
        );
      case 'trivia':
        return (
          <TriviaGame
            content={game.game_content.content}
            onComplete={(isCorrect, timeTaken) => handleGameComplete(isCorrect, timeTaken)}
          />
        );
      case 'spot_difference':
        return (
          <SpotDifferenceGame
            content={game.game_content.content}
            onComplete={(isCorrect, timeTaken, data) => 
              handleGameComplete(isCorrect, timeTaken, data)}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p>Unsupported game type</p>
          </div>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Game {currentGameIndex + 1} of {totalGames}
        </h3>
        {gameEndTime && (
          <div className="text-sm font-medium">
            Time Remaining: <CountdownTimer targetDate={gameEndTime} onEnd={() => onGameEnd(0)} />
          </div>
        )}
      </div>

      <div className="min-h-[300px]">
        {renderGameContent(currentGame)}
      </div>
    </Card>
  );
};
