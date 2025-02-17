
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

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
  const [progress, setProgress] = useState(0);
  const CONTEST_DURATION = endTime.getTime() - startTime.getTime();

  useEffect(() => {
    if (isInMyContests && now >= startTime && now <= endTime) {
      const timer = setInterval(() => {
        const currentTime = new Date();
        const elapsed = currentTime.getTime() - startTime.getTime();
        const progressValue = Math.min((elapsed / CONTEST_DURATION) * 100, 100);
        setProgress(progressValue);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isInMyContests, startTime, endTime, CONTEST_DURATION]);
  
  if (loading) {
    return (
      <div className="space-y-2 w-full">
        <Button disabled className="w-full">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {isInMyContests ? "Starting..." : "Joining..."}
        </Button>
      </div>
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
      <div className="space-y-2 w-full">
        <Button variant="secondary" className="w-full" onClick={onClick}>
          In Progress
        </Button>
        <Progress value={progress} className="h-1" />
      </div>
    );
  }

  // For My Contests
  if (isInMyContests) {
    if (now >= startTime && now <= endTime) {
      return (
        <div className="space-y-2 w-full">
          <Button className="w-full" onClick={onClick}>
            Play Now
          </Button>
          <Progress value={progress} className="h-1" />
        </div>
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
