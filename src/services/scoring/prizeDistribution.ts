
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

    // Set status to in_progress if it's still pending
    if (contest.prize_calculation_status === 'pending') {
      const { error: statusError } = await client
        .from('contests')
        .update({ prize_calculation_status: 'in_progress' })
        .eq('id', contestId);

      if (statusError) throw statusError;
    }

    // Process each winner's prize
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      // Skip if zero prize (shouldn't happen but just to be safe)
      if (prizeAmount <= 0) continue;

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

      // Check if transaction already exists to prevent duplicates
      const { data: existingTransaction } = await client
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reference_id', contestId)
        .eq('type', 'prize_payout')
        .maybeSingle();

      if (existingTransaction) {
        console.log('Prize already distributed to user:', userId);
        continue;
      }

      // Create transaction record
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

      // Update wallet balance
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
      .eq('id', contestId);

    if (finalStatusError) {
      throw finalStatusError;
    }

  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Try to revert status to pending if something went wrong
    try {
      await client
        .from('contests')
        .update({ prize_calculation_status: 'pending' })
        .eq('id', contestId);
    } catch (revertError) {
      console.error('Error reverting prize calculation status:', revertError);
    }
    throw error;
  }
}

// Helper function to get prize distribution details for a contest
export async function getPrizeDistributionDetails(contestId: string): Promise<{ 
  distributionType: string;
  prizePool: number;
  breakdowns: Record<string, number>;
}> {
  try {
    // Get contest details
    const { data: contest, error } = await supabase
      .from('contests')
      .select('prize_pool, prize_distribution_type')
      .eq('id', contestId)
      .single();
      
    if (error) throw error;
    
    // Get distribution model
    const models = await getPrizeDistributionModels();
    const model = models.get(contest.prize_distribution_type);
    
    if (!model) {
      throw new Error(`Distribution model not found: ${contest.prize_distribution_type}`);
    }
    
    return {
      distributionType: contest.prize_distribution_type,
      prizePool: contest.prize_pool,
      breakdowns: model.distribution_rules
    };
  } catch (error) {
    console.error('Error getting prize distribution details:', error);
    throw error;
  }
}
