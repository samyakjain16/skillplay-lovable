
import { PrizeDistributionModel } from "../types";

export const calculatePrizeAmounts = (
  rankings: Array<{ user_id: string }>,
  totalPrizePool: number,
  model: PrizeDistributionModel
): Map<string, number> => {
  const prizeDistribution = new Map<string, number>();

  rankings.forEach((ranking, index) => {
    const rank = (index + 1).toString();
    const percentage = model.distribution_rules[rank];
    
    if (percentage) {
      const prizeAmount = (totalPrizePool * percentage) / 100;
      prizeDistribution.set(ranking.user_id, prizeAmount);
    }
  });

  return prizeDistribution;
};
