
export interface ScoringRule {
  id: string;
  game_category: 'arrange_sort' | 'trivia' | 'spot_difference' | 'grid_flash_memory';
  base_points: number;
  additional_points?: number | null;
  conditions?: Record<string, any> | null;
  is_active: boolean;
}

export interface SpeedBonusRule {
  id: string;
  time_threshold: number;
  bonus_points: number;
  is_active: boolean;
}

export interface PrizeDistributionModel {
  id: string;
  name: string;
  min_participants: number;
  max_participants: number;
  distribution_rules: {
    [key: string]: number;
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type DatabaseScoringRule = Omit<ScoringRule, 'conditions'> & {
  conditions: string | null;
};

export interface DatabasePrizeModel extends Omit<PrizeDistributionModel, 'distribution_rules'> {
  distribution_rules: string;
}

// Expanded contest types based on the provided documentation
export type ContestType = 'multiplayer' | 'head_to_head' | 'practice' | 'fixed_participants' | 'scheduled';

// Structure for handling tiebreakers
export interface TiebreakerRules {
  primary: 'completion_time' | 'score';
  secondary: 'completion_time' | 'score';
  splitPrizeOnTie: boolean;
}

// Enhanced game result interface for tracking all necessary data
export interface GameResult {
  userId: string;
  gameContentId: string;
  contestId: string;
  score: number;
  timeTaken: number;
  isCorrect: boolean;
  additionalData?: Record<string, any>;
  completedAt: string;
}

// Score breakdown for detailed reporting
export interface ScoreBreakdown {
  total: number;
  breakdown: {
    basePoints: number;
    speedBonus: number;
    additionalPoints?: number;
  };
}

// Contest button status types for real-time updates
export type ContestButtonStatus = 
  | 'starting_countdown' 
  | 'continue_game' 
  | 'waiting_for_players'
  | 'finalizing_results' 
  | 'view_leaderboard' 
  | 'contest_full'
  | 'join_contest'
  | 'games_completed';
