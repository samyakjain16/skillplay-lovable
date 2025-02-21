
export interface GameProgress {
  count: number;
  lastCompletedGame?: {
    game_content_id: string;
    completed_at: string;
    score: number;
  };
  currentGameStart?: string | null;
}

export interface DetailedGameProgress {
  game_content_id: string;
  score: number;
  time_taken: number;
  completed_at: string;
  is_correct: boolean;
}
