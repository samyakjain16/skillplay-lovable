import { useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface Contest {
  id: string;
  status: 'active' | 'completed';
  end_time: string;
  series_count: number;
  start_time: string;
}

interface ContestCompletionHandlerProps {
  contest: Contest;
  completedGamesCount: number | undefined;
  hasRedirected: React.MutableRefObject<boolean>;
  onContestEnd?: () => void;
}

const CHECK_INTERVAL = 1000; // 1 second

export const ContestCompletionHandler = ({
  contest,
  completedGamesCount,
  hasRedirected,
  onContestEnd
}: ContestCompletionHandlerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if contest has ended
  const checkContestEnd = useCallback(() => {
    if (!contest || hasRedirected.current) return false;

    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isEnded = now > contestEnd || contest.status === 'completed';

    if (isEnded && !hasRedirected.current) {
      hasRedirected.current = true;

      // Handle different completion scenarios
      if (completedGamesCount && completedGamesCount >= contest.series_count) {
        toast({
          title: "Contest Completed",
          description: "You've completed all games. View the leaderboard!",
        });
      } else {
        toast({
          title: "Contest Ended",
          description: "This contest has ended. Redirecting to leaderboard...",
        });
      }

      // Call optional callback
      onContestEnd?.();

      // Navigate to leaderboard
      navigate(`/contest/${contest.id}/leaderboard`);
      return true;
    }

    return false;
  }, [contest, completedGamesCount, hasRedirected, navigate, toast, onContestEnd]);

  // Set up contest end checker
  useEffect(() => {
    // Initial check
    if (checkContestEnd()) return;

    // Set up interval for subsequent checks
    const timeCheckInterval = setInterval(() => {
      if (checkContestEnd()) {
        clearInterval(timeCheckInterval);
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(timeCheckInterval);
    };
  }, [checkContestEnd]);

  // Optional: Set up listener for contest status changes
  useEffect(() => {
    if (!contest || hasRedirected.current) return;

    const contestStatusChannel = supabase
      .channel(`contest-${contest.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contests',
          filter: `id=eq.${contest.id}`
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            checkContestEnd();
          }
        }
      )
      .subscribe();

    return () => {
      contestStatusChannel.unsubscribe();
    };
  }, [contest, hasRedirected, checkContestEnd]);

  return null;
};