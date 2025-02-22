
import { Contest } from "../ContestTypes";

export interface ContestStatusButtonProps {
  contest: Pick<Contest, "id" | "status" | "start_time" | "end_time" | "current_participants" | "max_participants" | "series_count" | "contest_type">;
  onClick?: () => void;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

export interface ButtonState {
  text: string;
  variant: "default";
  disabled: boolean;
  showProgress: boolean;
  customClass: string;
}
