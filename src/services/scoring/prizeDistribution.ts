
import { supabase } from "@/integrations/supabase/client";
import { getCachedModels, setCachedModels, transformDatabaseModels } from "./cache/distributionModelsCache";
import { calculatePrizeAmounts } from "./utils/prizeCalculator";
import { distributePrizes } from "./utils/prizeDistributor";
import { PrizeDistributionModel } from "./types";

export async function getPrizeDistributionModels() {
  const cachedModels = getCachedModels();
  if (cachedModels) return cachedModels;

  const { data: models, error } = await supabase
    .from('prize_distribution_models')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching prize distribution models:', error);
    if (cachedModels) return cachedModels;
    throw error;
  }

  const transformedModels = transformDatabaseModels(models);
  setCachedModels(transformedModels);

  return transformedModels;
}

export async function calculatePrizeDistribution(
  contestId: string,
  totalPrizePool: number,
  distributionType: string
): Promise<Map<string, number>> {
  const { data: contest, error: contestError } = await supabase
    .from('contests')
    .select('prize_calculation_status, status')
    .eq('id', contestId)
    .single();

  if (contestError) throw contestError;

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

  const prizeDistribution = calculatePrizeAmounts(rankings, totalPrizePool, model);

  if (prizeDistribution.size > 0) {
    await distributePrizes(contestId, prizeDistribution);
  }

  return prizeDistribution;
}

export { distributePrizes };
