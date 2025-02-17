
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Contest {
  status: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
}

export interface ContestStatusButtonProps {
  contest: Contest;
  onClick: () => void;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

export const ContestStatusButton = ({
  contest,
  onClick,
  loading = false,
  isInMyContests = false,
  userCompletedGames = false
}: ContestStatusButtonProps) => {
  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const isFull = contest.current_participants >= contest.max_participants;
  
  if (loading) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {isInMyContests ? "Starting..." : "Joining..."}
      </Button>
    );
  }

  // For completed contests
  if (now > endTime) {
    return (
      <Button variant="secondary" className="w-full" onClick={onClick}>
        View Results
      </Button>
    );
  }

  // For contests where player has completed their games
  if (userCompletedGames && now < endTime) {
    return (
      <Button variant="secondary" className="w-full" onClick={onClick}>
        In Progress
      </Button>
    );
  }

  // For My Contests
  if (isInMyContests) {
    if (now >= startTime && now <= endTime) {
      return (
        <Button className="w-full" onClick={onClick}>
          Play Now
        </Button>
      );
    }
    if (now < startTime) {
      return (
        <Button variant="secondary" className="w-full" disabled>
          Starting Soon
        </Button>
      );
    }
    return (
      <Button variant="secondary" className="w-full" disabled>
        Completed
      </Button>
    );
  }

  // For Available Contests
  if (isFull) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Contest Full
      </Button>
    );
  }

  return (
    <Button className="w-full" onClick={onClick}>
      Join Contest
    </Button>
  );
};
