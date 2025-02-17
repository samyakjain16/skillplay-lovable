
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

  // Fetch contest details
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

  // Fetch contest games
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

  // Calculate appropriate game index based on contest timing
  useEffect(() => {
    if (contest && contestGames && !gameStartTime) {
      const now = new Date();
      const contestStart = new Date(contest.start_time);
      const timeElapsed = Math.max(0, now.getTime() - contestStart.getTime()) / 1000; // in seconds
      const gameDuration = 30; // each game is 30 seconds

      // Calculate which game should be current based on elapsed time
      const appropriateGameIndex = Math.min(
        Math.floor(timeElapsed / gameDuration),
        contestGames.length - 1
      );

      if (appropriateGameIndex !== currentGameIndex) {
        setCurrentGameIndex(appropriateGameIndex);
        
        // Update the game index in the database
        if (user) {
          supabase
            .from('user_contests')
            .update({ 
              current_game_index: appropriateGameIndex,
              current_game_start_time: null // Will be set when game actually starts
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
      }
    }
  }, [contest, contestGames, currentGameIndex, gameStartTime, contestId, user, toast]);

  useEffect(() => {
    if (contestGames && contestGames.length > 0 && !gameStartTime) {
      const newStartTime = new Date();
      setGameStartTime(newStartTime);
      
      // Update the start time in the database
      if (user) {
        supabase
          .from('user_contests')
          .update({ 
            current_game_start_time: newStartTime.toISOString(),
            current_game_index: currentGameIndex
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating game start time:', error);
          });
      }
    }
  }, [contestGames, currentGameIndex, user, contestId, gameStartTime]);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 30;
    const isFinalGame = currentGameIndex === contestGames.length - 1;

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

    // Record game progress
    const { error: progressError } = await supabase
      .from("player_game_progress")
      .insert(progressData);

    if (progressError) {
      console.error("Error recording game progress:", progressError);
      return;
    }

    // Update user_contests with current game progress
    const { error: updateError } = await supabase
      .from('user_contests')
      .update({
        current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
        current_game_score: score,
        current_game_start_time: null // Reset for next game
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
