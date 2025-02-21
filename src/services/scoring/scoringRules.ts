
import { supabase } from "@/integrations/supabase/client";
import { ScoringRule, SpeedBonusRule, DatabaseScoringRule } from "./types";

// In-memory cache
let scoringRulesCache: Map<string, ScoringRule> | null = null;
let speedBonusRulesCache: SpeedBonusRule[] | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

export async function getScoringRules() {
  const now = Date.now();
  
  // Return cached rules if they're still valid
  if (scoringRulesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return scoringRulesCache;
  }

  // Fetch fresh rules from database
  const { data: rules, error } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching scoring rules:', error);
    if (scoringRulesCache) return scoringRulesCache;
    throw error;
  }

  // Transform database rules to application rules
  scoringRulesCache = new Map(
    (rules as DatabaseScoringRule[]).map(rule => [
      rule.game_category, 
      {
        ...rule,
        conditions: typeof rule.conditions === 'string' 
          ? JSON.parse(rule.conditions) 
          : rule.conditions
      }
    ])
  );
  lastCacheUpdate = now;

  return scoringRulesCache;
}

export async function getSpeedBonusRules() {
  const now = Date.now();
  
  // Return cached rules if they're still valid
  if (speedBonusRulesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return speedBonusRulesCache;
  }

  // Fetch fresh rules from database
  const { data: rules, error } = await supabase
    .from('speed_bonus_rules')
    .select('*')
    .eq('is_active', true)
    .order('time_threshold', { ascending: true });

  if (error) {
    console.error('Error fetching speed bonus rules:', error);
    if (speedBonusRulesCache) return speedBonusRulesCache;
    throw error;
  }

  // Update cache
  speedBonusRulesCache = rules;
  lastCacheUpdate = now;

  return speedBonusRulesCache;
}

export async function calculateGameScore(
  gameCategory: string,
  isCorrect: boolean,
  timeTaken: number,
  additionalData?: Record<string, any>
): Promise<number> {
  try {
    const scoringRules = await getScoringRules();
    const speedBonusRules = await getSpeedBonusRules();
    
    // Get base scoring rule for game type
    const rule = scoringRules.get(gameCategory);
    if (!rule) {
      console.error(`No scoring rule found for game category: ${gameCategory}`);
      return 0;
    }

    // If answer is incorrect, return 0
    if (!isCorrect) return 0;

    let totalScore = rule.base_points;

    // Add additional points based on conditions if they exist
    if (rule.additional_points && rule.conditions) {
      const conditionMet = evaluateConditions(rule.conditions, additionalData);
      if (conditionMet) {
        totalScore += rule.additional_points;
      }
    }

    // Only calculate speed bonus for correct answers
    if (isCorrect) {
      // Pass 30 seconds as the game duration for the speed bonus calculation
      const speedBonus = calculateSpeedBonus(timeTaken, 30, speedBonusRules);
      totalScore += speedBonus;
    }

    return totalScore;
  } catch (error) {
    console.error('Error calculating game score:', error);
    return 0;
  }
}

function evaluateConditions(
  conditions: Record<string, any>,
  data?: Record<string, any>
): boolean {
  if (!data) return false;
  
  switch (conditions.condition) {
    case 'all_spots_found':
      return data.foundSpots === data.totalSpots;
    case 'perfect_score':
      return data.score === 100;
    case 'quick_completion':
      return data.timeTaken && data.timeTaken < conditions.threshold;
    default:
      return false;
  }
}

function calculateSpeedBonus(
  submissionTime: number, // Time at which the answer was submitted
  gameDuration: number, // Total game duration (30 sec)
  speedRules: SpeedBonusRule[]
): number {
  const remainingTime = gameDuration - submissionTime; // Calculate remaining time

  // Find the highest applicable bonus based on remaining time
  for (const rule of speedRules) {
    if (remainingTime >= rule.time_threshold) {
      return rule.bonus_points;
    }
  }
  return 0;
}
