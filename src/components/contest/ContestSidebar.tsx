
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, MessageSquare } from "lucide-react";
import { ContestData } from "./types";

interface ContestSidebarProps {
  totalScore: number;
  contest: ContestData;
}

export const ContestSidebar = ({ totalScore, contest }: ContestSidebarProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Current Score</h3>
          </div>
          <p className="text-2xl font-bold">{totalScore}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Game Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>• Each game lasts 30 seconds</p>
            <p>• Total games: {contest.series_count}</p>
            <p>• Points are awarded based on speed and accuracy</p>
            <p>• Complete all games to finish the contest</p>
          </div>
        </CardContent>
      </Card>

      {contest.prize_pool > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Prize Pool</h3>
            </div>
            <p className="text-2xl font-bold">${contest.prize_pool}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution: {contest.prize_distribution_type}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
