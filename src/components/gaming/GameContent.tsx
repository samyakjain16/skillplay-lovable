
import { ArrangeSortGame } from "./games/ArrangeSortGame";
import { TriviaGame } from "./games/TriviaGame";
import { SpotDifferenceGame } from "./games/SpotDifferenceGame";

interface GameContentProps {
  game: any;
  onComplete: (score: number) => void;
}

export const GameContent = ({ game, onComplete }: GameContentProps) => {
  switch (game.game_content.category) {
    case 'arrange_sort':
      return (
        <ArrangeSortGame
          content={game.game_content.content}
          onComplete={onComplete}
        />
      );
    case 'trivia':
      return (
        <TriviaGame
          content={game.game_content.content}
          onComplete={onComplete}
        />
      );
    case 'spot_difference':
      return (
        <SpotDifferenceGame
          content={game.game_content.content}
          onComplete={onComplete}
        />
      );
    default:
      return (
        <div className="text-center py-8">
          <p>Unsupported game type</p>
        </div>
      );
  }
};
