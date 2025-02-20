
import { supabase } from "@/integrations/supabase/client";
import type { GameCategory } from "./types";

// Cache for scoring rules
let scoringRulesCache: Map<GameCategory, ScoringRule> | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

interface ScoringRule {
  base_points: number;
  additional_points?: number;
  conditions?: any;
}

interface SpeedBonusRule {
  time_threshold: number;
  bonus_points: number;
}

// In-memory cache for speed bonus rules
let speedBonusRulesCache: SpeedBonusRule[] | null = null;

export async function getSpeedBonusRules(): Promise<SpeedBonusRule[]> {
  if (speedBonusRulesCache) {
    return speedBonusRulesCache;
  }

  const { data, error } = await supabase
    .from('speed_bonus_rules')
    .select('*')
    .eq('is_active', true)
    .order('time_threshold', { ascending: true });

  if (error) {
    console.error('Error fetching speed bonus rules:', error);
    throw error;
  }

  speedBonusRulesCache = data;
  return data;
}

export async function getScoringRules(): Promise<Map<GameCategory, ScoringRule>> {
  const now = Date.now();
  
  if (scoringRulesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return scoringRulesCache;
  }

  const { data: rules, error } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching scoring rules:', error);
    if (scoringRulesCache) return scoringRulesCache;
    throw error;
  }

  // Transform database records to Map
  scoringRulesCache = new Map(
    rules.map(rule => [
      rule.game_category,
      {
        base_points: rule.base_points,
        additional_points: rule.additional_points,
        conditions: rule.conditions
      }
    ])
  );
  
  lastCacheUpdate = now;
  return scoringRulesCache;
}

export async function calculateScore(
  category: GameCategory,
  isCorrect: boolean,
  timeTaken: number | null
): Promise<number> {
  const rules = await getScoringRules();
  const rule = rules.get(category);

  if (!rule) {
    console.error(`No scoring rule found for category: ${category}`);
    return 0;
  }

  if (!isCorrect) return 0;

  let score = rule.base_points;

  // Apply speed bonus if time is available
  if (timeTaken !== null) {
    const speedBonuses = await getSpeedBonusRules();
    
    for (const bonus of speedBonuses) {
      if (timeTaken <= bonus.time_threshold) {
        score += bonus.bonus_points;
        break; // Only apply the highest applicable bonus
      }
    }
  }

  return score;
}

export async function updateGameScore(
  gameProgressId: string,
  isCorrect: boolean,
  timeTaken: number | null,
  category: GameCategory
): Promise<void> {
  // Calculate score based on game type and performance
  const score = await calculateScore(category, isCorrect, timeTaken);

  // Update the game progress record with the score
  const { error } = await supabase
    .from('player_game_progress')
    .update({
      score,
      is_correct: isCorrect,
      time_taken: timeTaken,
      completed_at: new Date().toISOString()
    })
    .eq('id', gameProgressId);

  if (error) {
    console.error('Error updating game score:', error);
    throw error;
  }
}

