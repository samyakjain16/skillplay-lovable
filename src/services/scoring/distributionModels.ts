
import { supabase } from "@/integrations/supabase/client";
import { PrizeDistributionModel, DatabasePrizeModel } from "./types";
import { ModelCache } from "./utils/cacheUtils";

// Cache for distribution models
const distributionModelsCache = new ModelCache<PrizeDistributionModel>();

/**
 * Fetches and caches prize distribution models from the database
 */
export async function getPrizeDistributionModels(): Promise<Map<string, PrizeDistributionModel>> {
  // Return from cache if valid
  if (distributionModelsCache.isValid()) {
    return distributionModelsCache.getCache()!;
  }

  const { data: models, error } = await supabase
    .from('prize_distribution_models')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching prize distribution models:', error);
    if (distributionModelsCache.getCache()) return distributionModelsCache.getCache()!;
    throw error;
  }

  // Transform database models to application models
  const modelMap = new Map<string, PrizeDistributionModel>(
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

  // Update cache
  distributionModelsCache.setCache(modelMap);
  return modelMap;
}

/**
 * Helper function to get prize distribution details for a contest
 */
export async function getPrizeDistributionDetails(contestId: string): Promise<{ 
  distributionType: string;
  prizePool: number;
  breakdowns: Record<string, number>;
}> {
  try {
    // Get distribution models
    const models = await getPrizeDistributionModels();
    
    // For mock contest IDs, extract the distribution type from the ID
    if (contestId.startsWith('mock-id-')) {
      const distributionType = contestId.replace('mock-id-', '');
      const model = models.get(distributionType);
      
      if (!model) {
        throw new Error(`Distribution model not found: ${distributionType}`);
      }
      
      return {
        distributionType: distributionType,
        prizePool: 0, // Mock value
        breakdowns: model.distribution_rules
      };
    }
    
    // For real contest IDs, get the data from the contests table
    const { data: contest, error } = await supabase
      .from('contests')
      .select('prize_pool, prize_distribution_type')
      .eq('id', contestId)
      .single();
      
    if (error) throw error;
    
    // Get distribution model
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
