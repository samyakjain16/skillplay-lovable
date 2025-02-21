
export interface ContestProgress {
  current_game_index: number;
  current_game_start_time: string | null;
  current_game_score: number;
  status: 'active' | 'completed';
}

export interface ContestData {
  series_count: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed';
}

export interface OperationLocks {
  update: boolean;
  gameEnd: boolean;
  timerInitialized: boolean;
  hasRedirected: boolean;
}
