
export interface ScoringRule {
  id: string;
  game_category: 'arrange_sort' | 'trivia' | 'spot_difference';
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

// Updated to handle both string and Json types for distribution_rules
export interface DatabasePrizeModel extends Omit<PrizeDistributionModel, 'distribution_rules'> {
  distribution_rules: string | Record<string, number>;
}

