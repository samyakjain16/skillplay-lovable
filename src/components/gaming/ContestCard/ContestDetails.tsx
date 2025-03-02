
import { Trophy, Users, Clock, Award, Hash, CircleDollarSign } from "lucide-react";
import { CountdownTimer } from "../CountdownTimer";
import { useQuery } from "@tanstack/react-query";
import { getPrizeDistributionDetails } from "@/services/scoring/distributionModels";

interface ContestDetailsProps {
  currentParticipants: number;
  maxParticipants: number;
  totalPrizePool: number;
  prizeDistributionType: string;
  seriesCount: number;
  startTime: string;
  contestType: string;
  entryFee: number;
}

export const ContestDetails = ({
  currentParticipants,
  maxParticipants,
  totalPrizePool,
  prizeDistributionType,
  seriesCount,
  startTime,
  contestType,
  entryFee
}: ContestDetailsProps) => {
  const { data: prizeDistribution, isError } = useQuery({
    queryKey: ["prize-distribution", prizeDistributionType],
    queryFn: async () => {
      // Create a mock contest ID for this query since we're just interested in the model
      return getPrizeDistributionDetails("mock-id-" + prizeDistributionType);
    },
    enabled: !!prizeDistributionType,
    retry: 1, // Only retry once to prevent too many error logs
    gcTime: 5 * 60 * 1000, // Keep failed queries in cache to prevent repeated failures
  });

  const getPrizeBreakdown = () => {
    if (!prizeDistribution || isError) return null;
    
    const actualPrizePool = contestType === 'fixed_participants' 
      ? maxParticipants * entryFee * 0.9 
      : totalPrizePool;

    const breakdown = [];
    try {
      // Parse the distribution rules and calculate prize amounts
      Object.entries(prizeDistribution.breakdowns).forEach(([position, percentage]) => {
        const numericPercentage = Number(percentage);
        const amount = (actualPrizePool * numericPercentage) / 100;
        breakdown.push({ position: parseInt(position), amount });
      });

      return breakdown.sort((a, b) => a.position - b.position);
    } catch (error) {
      console.error('Error calculating prize breakdown:', error);
      return null;
    }
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
        <span>${contestType === 'fixed_participants' 
          ? (maxParticipants * entryFee * 0.9).toFixed(2) 
          : totalPrizePool.toFixed(2)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-primary" />
          <span>Entry</span>
        </div>
        <span>${entryFee}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <span>Series</span>
        </div>
        <span>{seriesCount} Games</span>
      </div>
      
      {prizeBreakdown && prizeBreakdown.length > 0 && (
        <div className="border-t border-gray-100 pt-2 mt-2">
          <div className="text-xs font-medium text-primary mb-2">Prize Distribution</div>
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

      {contestType !== 'fixed_participants' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>Starts in</span>
          </div>
          <CountdownTimer targetDate={new Date(startTime)} />
        </div>
      )}
    </div>
  );
};
