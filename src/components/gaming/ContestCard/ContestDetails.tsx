
import { Trophy, Users, Clock, Award, Hash } from "lucide-react";
import { CountdownTimer } from "../CountdownTimer";

interface ContestDetailsProps {
  currentParticipants: number;
  maxParticipants: number;
  totalPrizePool: number;
  prizeDistributionType: string;
  seriesCount: number;
  startTime: string;
}

export const ContestDetails = ({
  currentParticipants,
  maxParticipants,
  totalPrizePool,
  prizeDistributionType,
  seriesCount,
  startTime,
}: ContestDetailsProps) => {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Players</span>
        </div>
        <span>{currentParticipants}/{maxParticipants}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span>Prize Pool</span>
        </div>
        <span>${totalPrizePool}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <span>Distribution</span>
        </div>
        <span className="capitalize">{prizeDistributionType}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <span>Series</span>
        </div>
        <span>{seriesCount} Games</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>Starts in</span>
        </div>
        <CountdownTimer targetDate={new Date(startTime)} />
      </div>
    </div>
  );
};
