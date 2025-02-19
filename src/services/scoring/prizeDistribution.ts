
import { supabase } from "@/integrations/supabase/client";
import { PrizeDistributionModel, DatabasePrizeModel } from "./types";

// In-memory cache
let distributionModelsCache: Map<string, PrizeDistributionModel> | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

export async function getPrizeDistributionModels() {
  const now = Date.now();
  
  if (distributionModelsCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return distributionModelsCache;
  }

  const { data: models, error } = await supabase
    .from('prize_distribution_models')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching prize distribution models:', error);
    if (distributionModelsCache) return distributionModelsCache;
    throw error;
  }

  // Transform database models to application models
  distributionModelsCache = new Map(
    (models as DatabasePrizeModel[]).map(model => {
      // Handle both string and JSONB types from database
      const rules = typeof model.distribution_rules === 'string' 
        ? JSON.parse(model.distribution_rules)
        : model.distribution_rules;

      return [
        model.name,
        {
          ...model,
          distribution_rules: rules
        }
      ];
    })
  );
  lastCacheUpdate = now;

  return distributionModelsCache;
}

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

  // Calculate prize amounts based on distribution rules and total prize pool
  rankings.forEach((ranking, index) => {
    const rank = (index + 1).toString();
    const percentage = model.distribution_rules[rank];
    
    if (percentage) {
      const prizeAmount = (totalPrizePool * percentage) / 100;
      prizeDistribution.set(ranking.user_id, prizeAmount);
    }
  });

  // After calculating prizes, distribute them and update status
  if (prizeDistribution.size > 0) {
    await distributePrizes(contestId, prizeDistribution);
  }

  return prizeDistribution;
}

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  const client = supabase;

  try {
    // First check if the contest is in a valid state for prize distribution
    const { data: contest, error: contestError } = await client
      .from('contests')
      .select('prize_calculation_status, status')
      .eq('id', contestId)
      .single();

    if (contestError) throw contestError;

    if (contest.prize_calculation_status === 'completed') {
      console.log('Prizes already distributed for contest:', contestId);
      return;
    }

    if (contest.status !== 'completed') {
      throw new Error('Cannot distribute prizes for non-completed contest');
    }

    // Set status to in_progress
    const { error: statusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'in_progress' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'pending');

    if (statusError) throw statusError;

    // Process each winner's prize
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      // Get current wallet balance
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        continue;
      }

      // Create transaction record first
      const { error: transactionError } = await client
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: prizeAmount,
          type: 'prize_payout',
          reference_id: contestId,
          status: 'completed'
        });

      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        continue;
      }

      // Then update wallet balance
      const { error: updateError } = await client
        .from('profiles')
        .update({ 
          wallet_balance: profile.wallet_balance + prizeAmount
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
      }
    }

    // Mark prize calculation as completed
    const { error: finalStatusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'in_progress');

    if (finalStatusError) {
      throw finalStatusError;
    }

  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Try to revert status to pending if something went wrong
    await client
      .from('contests')
      .update({ prize_calculation_status: 'pending' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'in_progress');
    throw error;
  }
}
