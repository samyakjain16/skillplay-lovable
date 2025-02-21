
export interface GameContent {
  game_content_id: string;
  category: 'arrange_sort' | 'trivia' | 'spot_difference';
  content: unknown;
}

export interface Game {
  id: string;
  game_content: GameContent;
}
