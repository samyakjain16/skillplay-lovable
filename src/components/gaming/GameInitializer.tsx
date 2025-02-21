import { useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface GameInitializerProps {
  contest: any;
  contestGames: any[];
  user: User | null;
  completedGamesCount: number | undefined;
  hasRedirected: React.MutableRefObject<boolean>;
  updateGameProgress: () => void;
  navigate: (path: string) => void;
  toast: any;
}

export const GameInitializer = ({
  contest,
  contestGames,
  user,
  completedGamesCount,
  hasRedirected,
  updateGameProgress,
  navigate,
  toast
}: GameInitializerProps) => {
  const checkAndHandleExpiredGame = useCallback(async () => {
    if (!user || !contest) return;

    try {
      const { data: userContest } = await supabase
        .from('user_contests')
        .select('current_game_start_time, current_game_index')
        .eq('contest_id', contest.id)
        .eq('user_id', user.id)
        .single();

      if (userContest?.current_game_start_time) {
        const startTime = new Date(userContest.current_game_start_time);
        const now = new Date();
        const timeDiff = now.getTime() - startTime.getTime();

        // If more than 30 seconds have passed
        if (timeDiff > 30000) {
          // Update the game progress with expired state
          await supabase
            .from('user_contests')
            .update({
              current_game_start_time: null,
              current_game_score: 0,
              current_game_index: userContest.current_game_index + 1
            })
            .eq('contest_id', contest.id)
            .eq('user_id', user.id);

          // Force refresh game progress
          updateGameProgress();
        }
      }
    } catch (error) {
      console.error('Error checking expired game:', error);
    }
  }, [contest, user, updateGameProgress]);

  useEffect(() => {
    if (!contest || !contestGames || !user || contestGames.length === 0 || hasRedirected.current) return;

    const initializeGame = async () => {
      try {
        // Check if contest has ended
        const now = new Date();
        const contestEnd = new Date(contest.end_time);
        
        if (now > contestEnd) {
          hasRedirected.current = true;
          navigate(`/contest/${contest.id}/leaderboard`);
          return;
        }

        // Check if user has completed all games
        if (completedGamesCount && completedGamesCount >= contest.series_count) {
          toast({
            title: "Contest Still in Progress",
            description: "You've completed all games. Check back when the contest ends to see the final results!",
          });
          navigate('/gaming');
          return;
        }

        // Check for expired game first
        await checkAndHandleExpiredGame();

        // Initialize or resume game progress
        await updateGameProgress();

      } catch (error) {
        console.error('Error in game initialization:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize game. Please try again.",
        });
      }
    };

    initializeGame();
  }, [
    contest, 
    contestGames, 
    user, 
    completedGamesCount, 
    hasRedirected, 
    updateGameProgress, 
    navigate, 
    toast,
    checkAndHandleExpiredGame
  ]);

  // Add contest status check interval
  useEffect(() => {
    if (!contest || !user) return;

    const checkContestStatus = async () => {
      try {
        const { data: currentContest } = await supabase
          .from('contests')
          .select('status, end_time')
          .eq('id', contest.id)
          .single();

        if (currentContest?.status === 'completed' || new Date() > new Date(currentContest?.end_time)) {
          hasRedirected.current = true;
          navigate(`/contest/${contest.id}/leaderboard`);
        }
      } catch (error) {
        console.error('Error checking contest status:', error);
      }
    };

    const statusInterval = setInterval(checkContestStatus, 30000); // Check every 30 seconds

    return () => clearInterval(statusInterval);
  }, [contest, user, navigate, hasRedirected]);

  return null;
};