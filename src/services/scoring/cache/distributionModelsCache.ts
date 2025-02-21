
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
      let rules: Record<string, number>;
      
      if (typeof model.distribution_rules === 'string') {
        // If it's a string, parse it
        rules = JSON.parse(model.distribution_rules);
      } else if (typeof model.distribution_rules === 'object' && model.distribution_rules !== null) {
        // If it's already an object, validate and convert it
        rules = Object.entries(model.distribution_rules).reduce((acc, [key, value]) => {
          acc[key] = Number(value);
          return acc;
        }, {} as Record<string, number>);
      } else {
        // Default empty rules if invalid
        console.warn(`Invalid distribution_rules format for model ${model.id}`);
        rules = {};
      }

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
