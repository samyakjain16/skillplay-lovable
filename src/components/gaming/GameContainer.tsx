import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CountdownTimer } from "./CountdownTimer";
import type { Database } from "@/integrations/supabase/types";
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";

type PlayerGameProgress = Database["public"]["Tables"]["player_game_progress"]["Insert"];

interface GameContent {
  id: string;
  category: 'arrange_sort' | 'trivia' | 'spot_difference';
  content: any;
}

interface GameContainerProps {
  contestId: string;
  onGameComplete: (score: number) => void;
}

export const GameContainer = ({ contestId, onGameComplete }: GameContainerProps) => {
  const { user } = useAuth();
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);

  const { data: contestGames, isLoading } = useQuery({
    queryKey: ["contest-games", contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_games")
        .select(`
          *,
          game_content (*)
        `)
        .eq("contest_id", contestId)
        .order("sequence_number");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (contestGames && contestGames.length > 0) {
      setGameStartTime(new Date());
    }
  }, [contestGames]);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 30;

    const progressData: PlayerGameProgress = {
      user_id: user.id,
      contest_id: contestId,
      game_content_id: currentGame.game_content_id,
      score: score,
      time_taken: timeSpent,
      started_at: gameStartTime?.toISOString(),
      completed_at: new Date().toISOString(),
      is_correct: score > 0
    };

    const { error } = await supabase
      .from("player_game_progress")
      .insert(progressData);

    if (error) {
      console.error("Error recording game progress:", error);
      return;
    }

    onGameComplete(score);
    
    if (currentGameIndex < contestGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setGameStartTime(new Date());
    }
  };

  const renderGameContent = (game: any) => {
    switch (game.game_content.category) {
      case 'arrange_sort':
        return (
          <ArrangeSortGame
            content={game.game_content.content}
            onComplete={handleGameEnd}
          />
        );
      case 'trivia':
        return (
          <TriviaGame
            content={game.game_content.content}
            onComplete={handleGameEnd}
          />
        );
      case 'spot_difference':
        return (
          <SpotDifferenceGame
            content={game.game_content.content}
            onComplete={handleGameEnd}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contestGames || contestGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p>No games available for this contest</p>
      </div>
    );
  }

  const currentGame = contestGames[currentGameIndex];
  const gameEndTime = gameStartTime ? new Date(gameStartTime.getTime() + 30000) : null;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Game {currentGameIndex + 1} of {contestGames.length}
        </h3>
        {gameEndTime && (
          <div className="text-sm font-medium">
            Time Remaining: <CountdownTimer targetDate={gameEndTime} onEnd={() => handleGameEnd(0)} />
          </div>
        )}
      </div>

      <div className="min-h-[300px]">
        {renderGameContent(currentGame)}
      </div>
    </Card>
  );
};
