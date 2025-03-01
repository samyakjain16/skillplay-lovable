
import { Card } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";
import { useEffect, useRef, useState } from "react";
import { calculateGameScore } from "@/services/scoring/scoringRules";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

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
  const gameEndInProgress = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined);

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
        toast({
          title: "Time's up!",
          description: "Moving to next game...",
          variant: "destructive"
        });
        onGameEnd(0);
      }
    }, remainingTime);

    // Update timeLeft state for display
    setTimeLeft(Math.max(0, Math.ceil(remainingTime / 1000)));

    // Set interval to update remaining time
    const intervalId = setInterval(() => {
      const newNow = new Date();
      const newRemainingTime = gameEndTime.getTime() - newNow.getTime();
      setTimeLeft(Math.max(0, Math.ceil(newRemainingTime / 1000)));
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      gameEndInProgress.current = false;
    };
  }, [gameEndTime, onGameEnd]);

  // Calculate remaining time for CountdownTimer
  const getRemainingSeconds = (): number | undefined => {
    if (!gameEndTime) return undefined;
    
    const now = new Date();
    const remainingMs = gameEndTime.getTime() - now.getTime();
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
    if (gameEndTime) {
      const now = new Date();
      if (now > gameEndTime) {
        toast({
          title: "Time expired",
          description: "Your answer was submitted after the timer ended.",
          variant: "destructive"
        });
        onGameEnd(0);
        return;
      }
    }

    // If answer is incorrect, immediately return 0 score but show feedback
    if (!isCorrect) {
      toast({
        title: "Incorrect answer",
        description: "No points awarded for this game.",
        variant: "destructive"
      });
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
      
      // Show success message with score breakdown
      let speedBonus = 0;
      if (timeTaken <= 5) speedBonus = 8;
      else if (timeTaken <= 10) speedBonus = 6;
      else if (timeTaken <= 15) speedBonus = 4;
      else if (timeTaken <= 20) speedBonus = 2;
      
      const baseScore = score - speedBonus;
      
      toast({
        title: "Correct answer!",
        description: `Base: ${baseScore} + Speed bonus: ${speedBonus} = Total: ${score}`,
        variant: "default"
      });
      
      onGameEnd(score);
    } catch (error) {
      console.error('Error calculating game score:', error);
      toast({
        title: "Error calculating score",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      onGameEnd(0);
    }
  };

  const renderGameContent = (game: any) => {
    // Check if game content exists
    if (!game?.game_content) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading game...</span>
        </div>
      );
    }

    // Common props for all game types
    const gameProps = {
      content: game.game_content.content,
      onComplete: (isCorrect: boolean, timeTaken: number, data?: Record<string, any>) => 
        handleGameComplete(isCorrect, timeTaken, data),
      remainingTime: timeLeft,
      isActive: !gameEndInProgress.current && !!gameEndTime
    };

    switch (game.game_content.category) {
      case 'arrange_sort':
        return <ArrangeSortGame {...gameProps} />;
      case 'trivia':
        return <TriviaGame {...gameProps} />;
      case 'spot_difference':
        return <SpotDifferenceGame {...gameProps} />;
      case 'grid_flash_memory':
        // Note: This game type would need to be implemented
        return (
          <div className="text-center py-8">
            <p>Grid Flash Memory game will be available soon</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-8">
            <p>Unsupported game type: {game.game_content.category}</p>
          </div>
        );
    }
  };

  if (!currentGame) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading contest...</span>
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
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <div className="text-sm font-medium">
              Time Remaining: {" "}
              <CountdownTimer 
                targetDate={gameEndTime} 
                initialTimeLeft={getRemainingSeconds()}
                onEnd={() => {
                  if (!gameEndInProgress.current) {
                    gameEndInProgress.current = true;
                    toast({
                      title: "Time's up!",
                      description: "Moving to next game...",
                      variant: "destructive"
                    });
                    onGameEnd(0);
                  }
                }} 
              />
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[300px]">
        {renderGameContent(currentGame)}
      </div>
    </Card>
  );
};
