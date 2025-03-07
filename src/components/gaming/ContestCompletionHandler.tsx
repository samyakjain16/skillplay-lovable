
import { useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ContestCompletionHandlerProps {
  contest: any;
  completedGamesCount: number | undefined;
  hasRedirected: React.MutableRefObject<boolean>;
}

export const ContestCompletionHandler = ({
  contest,
  completedGamesCount,
  hasRedirected
}: ContestCompletionHandlerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkContestStatus = useCallback(async () => {
    if (!contest || hasRedirected.current) return false;

    try {
      // Check contest status from server
      const { data: currentContest } = await supabase
        .from('contests')
        .select('status, end_time, series_count')
        .eq('id', contest.id)
        .single();

      const now = new Date();
      const contestEnd = new Date(currentContest?.end_time || contest.end_time);
      const seriesCount = currentContest?.series_count || contest.series_count;

      // Check if contest has ended either by time or status
      if ((now > contestEnd || currentContest?.status === 'completed') && !hasRedirected.current) {
        hasRedirected.current = true;

        // Check if user has completed all games
        if (completedGamesCount && completedGamesCount >= seriesCount) {
          toast({
            title: "Contest Ended",
            description: "You've completed all games. Redirecting to leaderboard...",
          });
        } else {
          toast({
            title: "Contest Ended",
            description: "Time's up! Redirecting to leaderboard...",
          });
        }

        // Small delay to allow toast to be seen
        setTimeout(() => {
          navigate(`/contest/${contest.id}/leaderboard`);
        }, 1500);
        return true;
      }

      // Check if all games are completed but contest hasn't ended
      if (completedGamesCount && 
          completedGamesCount >= seriesCount && 
          !hasRedirected.current) {
        hasRedirected.current = true;
        toast({
          title: "Games Completed",
          description: "You've completed all games. Check back when the contest ends to see the final results!",
        });
        
        // Small delay to allow toast to be seen
        setTimeout(() => {
          navigate('/gaming');
        }, 1500);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking contest status:', error);
      return false;
    }
  }, [contest, completedGamesCount, hasRedirected, navigate, toast]);

  useEffect(() => {
    // Initial check
    checkContestStatus();

    // Set up interval for periodic checks
    const timeCheckInterval = setInterval(async () => {
      const shouldStop = await checkContestStatus();
      if (shouldStop && timeCheckInterval) {
        clearInterval(timeCheckInterval);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (timeCheckInterval) {
        clearInterval(timeCheckInterval);
      }
    };
  }, [checkContestStatus]);

  // Effect to handle browser/tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkContestStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkContestStatus]);

  return null;
};
