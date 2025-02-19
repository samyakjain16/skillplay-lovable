
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
  distribution_rules: Record<string, number>;
  min_participants: number;
  max_participants: number;
  is_active: boolean;
}

export type DatabaseScoringRule = Omit<ScoringRule, 'conditions'> & {
  conditions: string | null;
};

export type DatabasePrizeModel = Omit<PrizeDistributionModel, 'distribution_rules'> & {
  distribution_rules: string;
};
