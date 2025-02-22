
export interface Contest {
  id: string;
  status: string;
  current_participants: number;
  start_time: string;
  end_time: string;
  updated_at: string;
}

export interface MyContestParticipation {
  id: string;
  contest: Contest;
}

export interface AvailableContest extends Contest {
  description: string;
  title: string;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
  prize_distribution_type: string;
  series_count: number;
}

export interface UserContest {
  id: string;
  user_id: string;
  contest_id: string;
  status: string;
  joined_at: string;
}
