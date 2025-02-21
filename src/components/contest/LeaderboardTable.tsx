
import { LeaderboardEntry } from "./types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showPrizes: boolean;
}

export const LeaderboardTable = ({ entries, showPrizes }: LeaderboardTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Rank</th>
            <th className="text-left p-4">Player</th>
            <th className="text-right p-4">Score</th>
            {showPrizes && <th className="text-right p-4">Prize</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.user_id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="p-4">#{entry.rank}</td>
              <td className="p-4">
                {entry.username || 'Anonymous'}
              </td>
              <td className="p-4 text-right">
                {entry.total_score.toLocaleString()}
              </td>
              {showPrizes && (
                <td className="p-4 text-right font-medium">
                  {entry.prize ? `$${entry.prize.toFixed(2)}` : '-'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
