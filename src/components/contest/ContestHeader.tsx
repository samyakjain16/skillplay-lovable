
import { Trophy } from "lucide-react";
import { ContestData } from "./types";

interface ContestHeaderProps {
  contest: ContestData;
}

export const ContestHeader = ({ contest }: ContestHeaderProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        Contest Leaderboard
      </h1>
      <p className="text-muted-foreground">{contest.title}</p>
      <p className="text-sm text-muted-foreground mt-2">
        Status: <span className="capitalize">{contest.status}</span>
      </p>
      {contest.status === 'completed' && contest.prize_pool > 0 && (
        <div className="mt-4 p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <span className="font-semibold">Total Prize Pool: ${contest.prize_pool}</span>
          </div>
        </div>
      )}
    </div>
  );
};
