
import { useEffect } from "react";
import { User } from "@supabase/supabase-js";

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
  useEffect(() => {
    if (!contest || !contestGames || !user || contestGames.length === 0 || hasRedirected.current) return;

    if (completedGamesCount && completedGamesCount >= contest.series_count) {
      const now = new Date();
      const contestEnd = new Date(contest.end_time);
      
      if (now > contestEnd) {
        hasRedirected.current = true;
        navigate(`/contest/${contest.id}/leaderboard`);
      } else {
        toast({
          title: "Contest Still in Progress",
          description: "You've completed all games. Check back when the contest ends to see the final results!",
        });
        navigate('/gaming');
      }
      return;
    }

    updateGameProgress();
  }, [contest, contestGames, user, completedGamesCount, hasRedirected, updateGameProgress, navigate, toast]);

  return null;
};
