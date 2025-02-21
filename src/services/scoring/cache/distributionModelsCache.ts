
import { PrizeDistributionModel, DatabasePrizeModel } from "../types";

// In-memory cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;
let distributionModelsCache: Map<string, PrizeDistributionModel> | null = null;

export const getCachedModels = () => {
  const now = Date.now();
  if (distributionModelsCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return distributionModelsCache;
  }
  return null;
};

export const setCachedModels = (models: Map<string, PrizeDistributionModel>) => {
  distributionModelsCache = models;
  lastCacheUpdate = Date.now();
};

export const transformDatabaseModels = (models: DatabasePrizeModel[]): Map<string, PrizeDistributionModel> => {
  return new Map(
    models.map(model => {
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
};
