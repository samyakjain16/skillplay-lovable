import { Card } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";
import { useEffect, useCallback } from "react";
import { calculateScore } from "@/services/scoring/scoringRules";
import { Loader2 } from "lucide-react";

type GameCategory = 'arrange_sort' | 'trivia' | 'spot_difference';

interface GameContent {
  category: GameCategory;
  content: unknown;
  game_content_id: string;
}

interface Game {
  game_content: GameContent;
  id: string;
}

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
        timeTaken,
        additionalData
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

    const commonProps = {
      content: game.game_content.content,
      onComplete: (isCorrect: boolean, timeTaken: number, data?: Record<string, unknown>) => 
        handleGameComplete(isCorrect, timeTaken, data)
    };

    switch (game.game_content.category) {
      case 'arrange_sort':
        return <ArrangeSortGame {...commonProps} />;
      case 'trivia':
        return <TriviaGame {...commonProps} />;
      case 'spot_difference':
        return <SpotDifferenceGame {...commonProps} />;
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