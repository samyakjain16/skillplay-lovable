
export interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  rank: number;
  username?: string | null;
  prize?: number;
}

export interface ContestData {
  id: string;
  title: string;
  status: string;
  prize_pool: number;
  prize_distribution_type: string;
}
