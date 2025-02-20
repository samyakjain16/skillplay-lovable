
export type GameCategory = 'trivia' | 'spot_difference' | 'arrange_sort';

export interface PrizeDistributionModel {
  id: string;
  name: string;
  min_participants: number;
  max_participants: number;
  distribution_rules: Record<string, number>;
  is_active: boolean;
}

export interface DatabasePrizeModel extends Omit<PrizeDistributionModel, 'distribution_rules'> {
  distribution_rules: string | Record<string, number>;
}
