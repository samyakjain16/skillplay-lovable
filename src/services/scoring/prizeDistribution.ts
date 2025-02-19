
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
    .select('prize_calculation_status')
    .eq('id', contestId)
    .single();

  if (contestError) throw contestError;

  if (contest.prize_calculation_status === 'completed') {
    console.log('Prizes already calculated for contest:', contestId);
    // Return existing prize distribution
    const { data: progressData } = await supabase
      .from('player_game_progress')
      .select('user_id, score')
      .eq('contest_id', contestId);

    const existingDistribution = new Map<string, number>();
    progressData?.forEach(entry => {
      existingDistribution.set(entry.user_id, entry.score);
    });
    return existingDistribution;
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
  await distributePrizes(contestId, prizeDistribution);

  return prizeDistribution;
}

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  // Start transaction using supabase client
  const client = supabase;

  try {
    // Update contest status to in_progress to prevent concurrent distributions
    const { error: statusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'in_progress' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'pending');

    if (statusError) throw statusError;

    // Update each winner's wallet balance and create transaction records
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      // Get current wallet balance
      const { data: profile } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      
      if (!profile) continue;

      // Update wallet balance
      const { error: updateError } = await client
        .from('profiles')
        .update({ 
          wallet_balance: profile.wallet_balance + prizeAmount
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
        continue;
      }

      // Create wallet transaction record
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
      }
    }

    // Mark prize calculation as completed
    const { error: finalStatusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId);

    if (finalStatusError) throw finalStatusError;

  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Try to revert status to pending if something went wrong
    await client
      .from('contests')
      .update({ prize_calculation_status: 'pending' })
      .eq('id', contestId);
    throw error;
  }
}
