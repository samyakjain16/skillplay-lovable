
import { Trophy, Users, Clock, Award, Hash } from "lucide-react";
import { CountdownTimer } from "../CountdownTimer";
import { useQuery } from "@tanstack/react-query";
import { getPrizeDistributionModels } from "@/services/scoring/prizeDistribution";

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
  const { data: distributionModels } = useQuery({
    queryKey: ["prize-distribution-models"],
    queryFn: getPrizeDistributionModels,
  });

  const getPrizeBreakdown = () => {
    if (!distributionModels) return null;
    const model = distributionModels.get(prizeDistributionType);
    if (!model) return null;

    const breakdown = [];
    for (let i = 1; i <= 3; i++) {
      const percentage = model.distribution_rules[i.toString()];
      if (percentage) {
        const amount = (totalPrizePool * percentage) / 100;
        breakdown.push({ position: i, amount });
      }
    }
    return breakdown;
  };

  const prizeBreakdown = getPrizeBreakdown();

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

      {prizeBreakdown && (
        <div className="border-t border-gray-100 pt-2 mt-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Prize Distribution</div>
          {prizeBreakdown.map(({ position, amount }) => (
            <div key={position} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-primary" />
                <span>Top {position}</span>
              </div>
              <span>${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

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
