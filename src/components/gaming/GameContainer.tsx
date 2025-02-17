
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
import { useToast } from "@/components/ui/use-toast";

type PlayerGameProgress = Database["public"]["Tables"]["player_game_progress"]["Insert"];

interface GameContainerProps {
  contestId: string;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  initialProgress?: {
    current_game_index: number;
    current_game_start_time: string | null;
    current_game_score: number;
  } | null;
}

export const GameContainer = ({ 
  contestId, 
  onGameComplete,
  initialProgress 
}: GameContainerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const GAME_DURATION = 30; // Game duration in seconds

  const { data: contest } = useQuery({
    queryKey: ["contest", contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", contestId)
        .single();

      if (error) throw error;
      return data;
    },
  });

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

  // Initialize game state when contest and games are loaded
  useEffect(() => {
    if (!contest || !contestGames || gameStartTime) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const totalElapsedTime = Math.max(0, now.getTime() - contestStart.getTime()) / 1000;
    
    // Calculate appropriate game index
    const appropriateGameIndex = Math.min(
      Math.floor(totalElapsedTime / GAME_DURATION),
      contestGames.length - 1
    );

    // If we're joining mid-game, calculate remaining time for current game
    if (appropriateGameIndex === currentGameIndex) {
      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
      
      // Set start time based on remaining time
      const newStartTime = new Date(now.getTime() - (timeIntoCurrentGame * 1000));
      setGameStartTime(newStartTime);
    } else {
      // If we're starting a new game, give full duration
      setCurrentGameIndex(appropriateGameIndex);
      setRemainingTime(GAME_DURATION);
      setGameStartTime(new Date());
    }

    // Update game index in database if needed
    if (user && appropriateGameIndex !== currentGameIndex) {
      supabase
        .from('user_contests')
        .update({ 
          current_game_index: appropriateGameIndex,
          current_game_start_time: new Date().toISOString()
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating game index:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to update game progress"
            });
          }
        });
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, toast]);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : GAME_DURATION;
    const isFinalGame = currentGameIndex === contestGames.length - 1;

    try {
      const { data: existingProgress } = await supabase
        .from("player_game_progress")
        .select("id")
        .match({
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content_id
        })
        .maybeSingle();

      if (!existingProgress) {
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

        const { error: progressError } = await supabase
          .from("player_game_progress")
          .insert(progressData);

        if (progressError) {
          console.error("Error recording game progress:", progressError);
          return;
        }
      }

      // Update user contest progress
      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: isFinalGame ? null : new Date().toISOString()
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating contest progress:", updateError);
        return;
      }

      onGameComplete(score, isFinalGame);
      
      if (!isFinalGame) {
        setCurrentGameIndex(prev => prev + 1);
        setGameStartTime(new Date());
        setRemainingTime(GAME_DURATION);
      }
    } catch (error) {
      console.error("Error in handleGameEnd:", error);
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
  const gameEndTime = gameStartTime && remainingTime 
    ? new Date(gameStartTime.getTime() + (remainingTime * 1000)) 
    : null;

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
