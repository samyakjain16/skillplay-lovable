
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user && !!contestGames && !!contestGames[currentGameIndex],
  });

  useEffect(() => {
    if (!contest || !contestGames || !user || contestGames.length === 0) return;

    const now = new Date();
    const contestEnd = new Date(contest.end_time);

    // If user has completed all games, show appropriate message based on contest status
    if (completedGamesCount && completedGamesCount >= contest.series_count) {
      if (now > contestEnd) {
        navigate(`/contest/${contestId}/leaderboard`);
      } else {
        toast({
          title: "Contest Still in Progress",
          description: "You've completed all games. Check back when the contest ends to see the final results!",
        });
        navigate('/gaming');
      }
      return;
    }

    // If current game is already completed, move to next game
    if (currentGameProgress && currentGameIndex < contestGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setGameStartTime(new Date());
      return;
    }

    const contestStart = new Date(contest.start_time);
    if (now < contestStart) return;
    if (now > contestEnd) return;

    const elapsedTime = now.getTime() - contestStart.getTime();
    const gameDuration = 30000; // 30 seconds in milliseconds
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
    const now = new Date().toISOString();

    try {
      // First, update user_contests to mark current game progress
      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: null,
          status: isFinalGame ? 'completed' : 'active',
          completed_at: isFinalGame ? now : null, // Add completed_at timestamp for final game
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating contest progress:", updateError);
        return;
      }

      // Then, record game progress
      const progressData: PlayerGameProgress = {
        user_id: user.id,
        contest_id: contestId,
        game_content_id: currentGame.game_content_id,
        score: score,
        time_taken: timeSpent,
        started_at: gameStartTime?.toISOString(),
        completed_at: now,
        is_correct: score > 0
      };

      const { error: progressError } = await supabase
        .from("player_game_progress")
        .insert(progressData);

      if (progressError) {
        if (progressError.code === '23505') { // Unique violation
          console.log("Game already completed, moving to next game");
          if (!isFinalGame) {
            setCurrentGameIndex(prev => prev + 1);
            setGameStartTime(new Date());
          }
          return;
        }
        throw progressError;
      }

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

  // Show appropriate message for completed contests
  if (completedGamesCount && contest && completedGamesCount >= contest.series_count) {
    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isContestFinished = now > contestEnd;

    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold mb-4">Contest Progress</h3>
          {isContestFinished ? (
            <>
              <p className="text-muted-foreground mb-6">Contest has ended. View the final results!</p>
              <Button onClick={() => navigate(`/contest/${contestId}/leaderboard`)}>
                View Leaderboard
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                You've completed all games! The contest is still in progress.
                Check back when it ends to see the final results.
              </p>
              <Button onClick={() => navigate('/gaming')}>
                Return to Gaming
              </Button>
            </>
          )}
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
