
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

  try {
    // This will be used for display purposes only
    // Actual prize distribution is handled server-side
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
      return new Map<string, number>(); // Return empty map instead of throwing
    }

    const prizeDistribution = new Map<string, number>();

    // Map to store prize amounts by rank
    const rankPrizesMap = new Map<number, number>();
    
    // Calculate prize amount for each rank based on distribution model
    rankings.forEach(ranking => {
      const rank = ranking.rank; // Use rank (based only on score)
      const percentage = model.distribution_rules[rank.toString()];
      
      if (percentage && !rankPrizesMap.has(rank)) {
        const prizeForRank = (totalPrizePool * percentage) / 100;
        rankPrizesMap.set(rank, prizeForRank);
      }
    });

    // Group users by score to identify ties
    const scoreGroups = new Map<number, Array<{userId: string, completionRank: number}>>();
    
    rankings.forEach(ranking => {
      const score = ranking.total_score;
      
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      
      scoreGroups.get(score)!.push({
        userId: ranking.user_id,
        completionRank: ranking.completion_rank
      });
    });

    // Distribute prizes based on score groups
    scoreGroups.forEach((users, score) => {
      // Find the rank for this score group
      const firstUser = users[0];
      const rankForScore = rankings.find(r => r.user_id === firstUser.userId)?.rank;
      
      if (!rankForScore || !rankPrizesMap.has(rankForScore)) {
        return; // No prize for this rank
      }
      
      const prizeForRank = rankPrizesMap.get(rankForScore)!;
      
      if (users.length === 1) {
        // Only one user with this score, they get the full prize
        prizeDistribution.set(users[0].userId, Math.floor(prizeForRank * 100) / 100);
      } else {
        // Multiple users with the same score - handle ties properly
        // Split the prize equally among tied users regardless of completion time
        const prizePerUser = Math.floor((prizeForRank / users.length) * 100) / 100;
        
        users.forEach(user => {
          prizeDistribution.set(user.userId, prizePerUser);
        });
      }
    });

    // Request prize distribution from the server
    if (prizeDistribution.size > 0) {
      try {
        // Trigger server-side prize distribution
        await distributePrizes(contestId, prizeDistribution);
      } catch (error) {
        console.error('Error during prize distribution:', error);
        // We still want to return the distribution for display
      }
    }

    return prizeDistribution;
  } catch (error) {
    console.error('Error calculating prize distribution:', error);
    return new Map<string, number>();
  }
}
