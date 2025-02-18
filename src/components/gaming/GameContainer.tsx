
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
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );

  // Check if user has completed all games
  const { data: completedGamesCount, refetch: refetchCompletedGames } = useQuery({
    queryKey: ["completed-games", contestId, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("player_game_progress")
        .select("*", { count: 'exact', head: true })
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .not("completed_at", "is", null);

      if (error) throw error;
      return count || 0;
    },
  });

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

  // Check if current game has already been completed
  const { data: currentGameProgress } = useQuery({
    queryKey: ["game-progress", contestId, user?.id, currentGameIndex],
    queryFn: async () => {
      if (!user || !contestGames) return null;
      const currentGame = contestGames[currentGameIndex];
      if (!currentGame) return null;

      const { data, error } = await supabase
        .from("player_game_progress")
        .select("*")
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .eq("game_content_id", currentGame.game_content_id)
        .not("completed_at", "is", null)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"
      return data;
    },
    enabled: !!user && !!contestGames,
  });

  useEffect(() => {
    if (!contest || !contestGames || !user || contestGames.length === 0) return;

    // If user has completed all games, redirect to leaderboard
    if (completedGamesCount && completedGamesCount >= contest.series_count) {
      toast({
        title: "Contest Completed",
        description: "You have completed all games in this contest.",
      });
      navigate(`/contest/${contestId}/leaderboard`);
      return;
    }

    // If current game is already completed, move to next game
    if (currentGameProgress && currentGameIndex < contestGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setGameStartTime(new Date());
      return;
    }

    const now = new Date();
    const contestStart = new Date(contest.start_time);
    const contestEnd = new Date(contest.end_time);
    const gameDuration = 30000; // 30 seconds in milliseconds

    if (now < contestStart) return;
    if (now > contestEnd) return;

    const elapsedTime = now.getTime() - contestStart.getTime();
    const currentGameByTime = Math.floor(elapsedTime / gameDuration);
    const timeIntoCurrentGame = elapsedTime % gameDuration;

    if (!gameStartTime) {
      const adjustedStartTime = new Date(now.getTime() - timeIntoCurrentGame);
      
      setCurrentGameIndex(currentGameByTime);
      setGameStartTime(adjustedStartTime);

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
  }, [contest, contestGames, user, contestId, gameStartTime, completedGamesCount, currentGameProgress, currentGameIndex, toast, navigate]);

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

    try {
      // Check if game has already been completed
      const { data: existingProgress } = await supabase
        .from("player_game_progress")
        .select("*")
        .eq("contest_id", contestId)
        .eq("user_id", user.id)
        .eq("game_content_id", currentGame.game_content_id)
        .not("completed_at", "is", null)
        .single();

      if (existingProgress) {
        console.log("Game already completed, moving to next game");
        if (!isFinalGame) {
          setCurrentGameIndex(prev => prev + 1);
          setGameStartTime(new Date());
        }
        return;
      }

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
        if (progressError.code === '23505') { // Unique violation
          console.log("Game already completed, skipping progress update");
          return;
        }
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to record game progress. Please try again.",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: null,
          status: isFinalGame ? 'completed' : 'active',
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating contest progress:", updateError);
        return;
      }

      // Refetch completed games count to trigger redirect if needed
      await refetchCompletedGames();
      
      onGameComplete(score, isFinalGame);
      
      if (!isFinalGame) {
        setCurrentGameIndex(prev => prev + 1);
        setGameStartTime(new Date());
      }

    } catch (error) {
      console.error("Error in handleGameEnd:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving your progress.",
      });
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

  // If all games are completed, show completion message
  if (completedGamesCount && contest && completedGamesCount >= contest.series_count) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold mb-4">Contest Completed!</h3>
          <p className="text-muted-foreground mb-6">You have completed all games in this contest.</p>
          <Button onClick={() => navigate(`/contest/${contestId}/leaderboard`)}>
            View Leaderboard
          </Button>
        </div>
      </Card>
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
