
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
    (models as DatabasePrizeModel[]).map(model => [
      model.name,
      {
        ...model,
        distribution_rules: JSON.parse(model.distribution_rules)
      }
    ])
  );
  lastCacheUpdate = now;

  return distributionModelsCache;
}

export async function calculatePrizeDistribution(
  contestId: string,
  totalPrizePool: number,
  distributionType: string
): Promise<Map<string, number>> {
  const models = await getPrizeDistributionModels();
  const model = models.get(distributionType);

  if (!model) {
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

  return prizeDistribution;
}
