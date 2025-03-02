
import { supabase } from "@/integrations/supabase/client";
import { getPrizeDistributionModels } from "./distributionModels";
import { distributePrizes } from "./prizeDistribution";

/**
 * Calculates prize distribution for a completed contest
 */
export async function calculatePrizeDistribution(
  contestId: string,
  totalPrizePool: number,
  distributionType: string
): Promise<Map<string, number>> {
  // Check if prizes have already been calculated
  const { data: contest, error: contestError } = await supabase
    .from('contests')
    .select('prize_calculation_status, status')
    .eq('id', contestId)
    .single();

  if (contestError) throw contestError;

  // If prizes are already calculated, return existing distribution
  if (contest.prize_calculation_status === 'completed') {
    console.log('Prizes already calculated for contest:', contestId);
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount')
      .eq('reference_id', contestId)
      .eq('type', 'prize_payout');

    const existingDistribution = new Map<string, number>();
    transactions?.forEach(tx => {
      existingDistribution.set(tx.user_id, tx.amount);
    });
    return existingDistribution;
  }

  // Only calculate prizes for completed contests
  if (contest.status !== 'completed') {
    console.log('Contest not completed yet:', contestId);
    return new Map<string, number>();
  }

  const models = await getPrizeDistributionModels();
  const model = models.get(distributionType);

  if (!model) {
    console.error('Distribution type not found:', distributionType);
    console.log('Available models:', Array.from(models.keys()));
    throw new Error(`No prize distribution model found for type: ${distributionType}`);
  }

  // Get final rankings for the contest
  const { data: rankings, error } = await supabase
    .rpc('get_contest_leaderboard', { contest_id: contestId });

  if (error) {
    console.error('Error fetching contest rankings:', error);
    throw error;
  }

  if (!rankings || rankings.length === 0) {
    console.log('No rankings found for contest:', contestId);
    return new Map<string, number>();
  }

  const prizeDistribution = new Map<string, number>();

  // Handle tie scenarios based on completion_rank
  const rankPrizesMap = new Map<number, { total: number, users: string[] }>();
  
  // Group users by their completion_rank and calculate prize pools per rank
  rankings.forEach(ranking => {
    const rank = ranking.completion_rank;
    const percentage = model.distribution_rules[rank.toString()];
    
    if (percentage) {
      const prizeForRank = (totalPrizePool * percentage) / 100;
      
      if (!rankPrizesMap.has(rank)) {
        rankPrizesMap.set(rank, { total: prizeForRank, users: [ranking.user_id] });
      } else {
        const entry = rankPrizesMap.get(rank)!;
        entry.users.push(ranking.user_id);
      }
    }
  });

  // Distribute prizes based on the grouped ranks
  rankPrizesMap.forEach(({ total, users }, rank) => {
    const prizePerUser = Math.floor(total / users.length); // Split evenly for tied users
    
    users.forEach(userId => {
      prizeDistribution.set(userId, prizePerUser);
    });
  });

  // After calculating prizes, distribute them and update status
  if (prizeDistribution.size > 0) {
    await distributePrizes(contestId, prizeDistribution);
  }

  return prizeDistribution;
}
