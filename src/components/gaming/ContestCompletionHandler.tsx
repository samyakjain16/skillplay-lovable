
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    if (!contest || hasRedirected.current) return;

    const checkContestEnd = () => {
      const now = new Date();
      const contestEnd = new Date(contest.end_time);

      if (now > contestEnd && !hasRedirected.current) {
        hasRedirected.current = true;
        toast({
          title: "Contest Ended",
          description: "This contest has ended. Redirecting to leaderboard...",
        });
        navigate(`/contest/${contest.id}/leaderboard`);
        return true;
      }
      return false;
    };

    const timeCheckInterval = setInterval(checkContestEnd, 1000);

    return () => {
      clearInterval(timeCheckInterval);
    };
  }, [contest, navigate, toast, hasRedirected]);

  return null;
};
