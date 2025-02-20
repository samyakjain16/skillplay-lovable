
export interface Contest {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  entry_fee: number;
  prize_pool: number;
  current_participants: number;
  max_participants: number;
  status: 'upcoming' | 'waiting_for_players' | 'in_progress' | 'completed';
  contest_type: 'scheduled' | 'fixed_participants';
  prize_distribution_type: string;
  series_count: number;
  prize_calculation_status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
