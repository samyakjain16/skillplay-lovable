
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

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  for (const [userId, prizeAmount] of prizeDistribution.entries()) {
    try {
      // Create transaction record first
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: prizeAmount,
          type: 'prize_payout',
          reference_id: contestId,
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        continue;
      }

      // Then update wallet balance
      const { error: updateError } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: prizeAmount
      });

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
        // If wallet update fails, mark transaction as failed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      }
    } catch (error) {
      console.error('Error distributing prize to user:', userId, error);
    }
  }
}
