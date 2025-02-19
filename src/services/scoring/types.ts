
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

export interface DatabasePrizeModel extends Omit<PrizeDistributionModel, 'distribution_rules'> {
  distribution_rules: string;
}
