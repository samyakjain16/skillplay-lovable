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
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );

  // Fetch contest details including start_time and end_time
  const { data: contest, isLoading: isLoadingContest } = useQuery({
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

  const { data: contestGames, isLoading: isLoadingGames } = useQuery({
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
    if (!contest || !contestGames || contestGames.length === 0) return;

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const contestEnd = new Date(contest.end_time);
    const gameDuration = 30000; // 30 seconds in milliseconds

    // If the contest hasn't started yet, wait
    if (now < contestStart) return;

    // If the contest has ended, don't proceed
    if (now > contestEnd) return;

    const elapsedTime = now.getTime() - contestStart.getTime();
    const currentGameByTime = Math.floor(elapsedTime / gameDuration);
    const timeIntoCurrentGame = elapsedTime % gameDuration;

    // If joining mid-contest or no game time is set
    if (!gameStartTime) {
        // Calculate the actual start time by subtracting the time already elapsed in current game
        const adjustedStartTime = new Date(now.getTime() - timeIntoCurrentGame);
        
        setCurrentGameIndex(currentGameByTime);
        setGameStartTime(adjustedStartTime);

        // Update the progress in the database
        if (user) {
            supabase
                .from('user_contests')
                .update({ 
                    current_game_index: currentGameByTime,
                    current_game_start_time: adjustedStartTime.toISOString()
                })
                .eq('contest_id', contestId)
                .eq('user_id', user.id)
                .then(({ error }) => {
                    if (error) console.error('Error updating game progress:', error);
                });
        }
    }
}, [contest, contestGames, user, contestId, gameStartTime]);

  const getGameEndTime = (): Date | null => {
    if (!contest || !gameStartTime) return null;

    const contestStart = new Date(contest.start_time);
    const nextGameStart = new Date(contestStart.getTime() + (currentGameIndex + 1) * 30000);
    return nextGameStart;
  };

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
        current_game_start_time: null
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

  if (isLoadingContest || isLoadingGames) {
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
  const gameEndTime = getGameEndTime();

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