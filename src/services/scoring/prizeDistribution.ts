
import { supabase } from "@/integrations/supabase/client";
import { getPrizeDistributionModels } from "./cache/distributionModelsCache";
import { distributePrizes } from "./wallet/prizeDistribution";

export { getPrizeDistributionModels } from "./cache/distributionModelsCache";
export { distributePrizes } from "./wallet/prizeDistribution";

export async function calculatePrizeDistribution(
  contestId: string,
  totalPrizePool: number,
  distributionType: string
): Promise<Map<string, number>> {
  console.log('Starting prize distribution for contest:', contestId);
  
  // First check if prizes were already distributed
  const { data: existingPrizes } = await supabase
    .from('wallet_transactions')
    .select('user_id, amount')
    .eq('reference_id', contestId)
    .eq('type', 'prize_payout');

  if (existingPrizes && existingPrizes.length > 0) {
    console.log('Prizes already distributed for contest:', contestId);
    return new Map(existingPrizes.map(p => [p.user_id, p.amount]));
  }

  try {
    // Get final rankings
    const { data: rankings, error: rankingsError } = await supabase
      .rpc('get_contest_leaderboard', { contest_id: contestId });

    if (rankingsError) throw rankingsError;
    if (!rankings || rankings.length === 0) {
      console.log('No rankings found for contest:', contestId);
      return new Map();
    }

    // Get distribution model
    const models = await getPrizeDistributionModels();
    const model = models.get(distributionType);

    if (!model) {
      throw new Error(`No prize distribution model found for type: ${distributionType}`);
    }

    console.log('Applying distribution model:', distributionType);
    const prizeDistribution = new Map<string, number>();

    // Calculate prize amounts based on ranking
    rankings.forEach((ranking, index) => {
      const rank = (index + 1).toString();
      const percentage = model.distribution_rules[rank];
      
      if (percentage) {
        const prizeAmount = Math.floor((totalPrizePool * percentage) / 100);
        if (prizeAmount > 0) {
          prizeDistribution.set(ranking.user_id, prizeAmount);
          console.log(`Calculated prize for rank ${rank}:`, prizeAmount);
        }
      }
    });

    // Immediately distribute prizes if any were calculated
    if (prizeDistribution.size > 0) {
      console.log('Distributing prizes to winners...');
      await distributePrizes(contestId, prizeDistribution);
      
      // Update contest status
      await supabase
        .from('contests')
        .update({ prize_calculation_status: 'completed' })
        .eq('id', contestId);
    } else {
      console.log('No prizes to distribute');
      await supabase
        .from('contests')
        .update({ prize_calculation_status: 'completed' })
        .eq('id', contestId);
    }

    return prizeDistribution;
  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Mark as failed and rethrow
    await supabase
      .from('contests')
      .update({ prize_calculation_status: 'failed' })
      .eq('id', contestId);
    throw error;
  }
}
