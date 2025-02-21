
import { Card } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";
import { useEffect, useRef } from "react";
import { calculateGameScore } from "@/services/scoring/scoringRules";
import { Loader2 } from "lucide-react";
import { GameTimeSlot } from "@/components/contest/types";

interface GameContentProps {
  currentGame: any;
  currentGameIndex: number;
  totalGames: number;
  gameEndTime: Date | null;
  onGameEnd: (score: number) => void;
  gameTimeSlot: GameTimeSlot | null;
}

export const GameContent = ({
  currentGame,
  currentGameIndex,
  totalGames,
  gameEndTime,
  onGameEnd,
  gameTimeSlot
}: GameContentProps) => {
  const gameEndInProgress = useRef(false);

  // Effect to handle game end when time runs out
  useEffect(() => {
    if (!gameEndTime) return;

    const now = new Date();
    const remainingTime = gameEndTime.getTime() - now.getTime();

    // If already past end time, end immediately
    if (remainingTime <= 0 && !gameEndInProgress.current) {
      gameEndInProgress.current = true;
      onGameEnd(0);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!gameEndInProgress.current) {
        gameEndInProgress.current = true;
        onGameEnd(0);
      }
    }, remainingTime);

    return () => {
      clearTimeout(timeoutId);
      gameEndInProgress.current = false;
    };
  }, [gameEndTime, onGameEnd]);

  // Calculate remaining time for CountdownTimer
  const getRemainingSeconds = (): number | undefined => {
    if (!gameTimeSlot) return undefined;
    
    const now = new Date();
    const endTime = new Date(gameTimeSlot.end_time);
    const remainingMs = endTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  };

  const handleGameComplete = async (
    isCorrect: boolean,
    timeTaken: number,
    additionalData?: Record<string, any>
  ) => {
    if (gameEndInProgress.current) {
      return; // Prevent multiple submissions
    }

    if (!currentGame?.game_content?.category) {
      console.error('Game content or category is missing');
      onGameEnd(0);
      return;
    }

    // Validate time taken against game end time
    if (gameTimeSlot) {
      const now = new Date();
      const endTime = new Date(gameTimeSlot.end_time);
      if (now > endTime) {
        onGameEnd(0);
        return;
      }
    }

    // If answer is incorrect, immediately return 0 score
    if (!isCorrect) {
      onGameEnd(0);
      return;
    }

    try {
      gameEndInProgress.current = true;
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
    // Check if game content exists
    if (!game?.game_content) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // Common props for all game types
    const gameProps = {
      content: game.game_content.content,
      onComplete: (isCorrect: boolean, timeTaken: number, data?: Record<string, any>) => 
        handleGameComplete(isCorrect, timeTaken, data),
      remainingTime: getRemainingSeconds(),
      isActive: !gameEndInProgress.current && !!gameEndTime
    };

    switch (game.game_content.category) {
      case 'arrange_sort':
        return <ArrangeSortGame {...gameProps} />;
      case 'trivia':
        return <TriviaGame {...gameProps} />;
      case 'spot_difference':
        return <SpotDifferenceGame {...gameProps} />;
      default:
        return (
          <div className="text-center py-8">
            <p>Unsupported game type</p>
          </div>
        );
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
        {gameTimeSlot && (
          <div className="text-sm font-medium">
            Time Remaining: {" "}
            <CountdownTimer 
              targetDate={new Date(gameTimeSlot.end_time)}
              initialTimeLeft={getRemainingSeconds()}
              onEnd={() => {
                if (!gameEndInProgress.current) {
                  gameEndInProgress.current = true;
                  onGameEnd(0);
                }
              }} 
            />
          </div>
        )}
      </div>

      <div className="min-h-[300px]">
        {renderGameContent(currentGame)}
      </div>
    </Card>
  );
};
