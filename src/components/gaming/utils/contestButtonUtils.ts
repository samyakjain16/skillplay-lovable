import { type Contest } from "./ContestTypes";

const GAME_DURATION_MS = 30000; // 30 seconds

interface ButtonState {
  text: string;
  variant: "default" | "secondary" | "destructive";
  disabled: boolean;
  showProgress: boolean;
  customClass: string;
}

interface TimeStatus {
  hasStarted: boolean;
  hasEnded: boolean;
  progress: number;
  currentGameIndex: number;
  remainingTime: number;
  gameProgress: number;
}

export const getTimeStatus = (startTime: string, endTime: string): TimeStatus => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const currentGameIndex = Math.floor(elapsed / GAME_DURATION_MS);
  
  // Calculate progress within current game
  const gameElapsed = elapsed % GAME_DURATION_MS;
  const gameProgress = Math.min((gameElapsed / GAME_DURATION_MS) * 100, 100);
  
  const hasEnded = now > end;
  
  return {
    hasStarted: now >= start,
    hasEnded,
    progress: Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100),
    currentGameIndex: hasEnded ? 0 : currentGameIndex,
    remainingTime: Math.max(end.getTime() - now.getTime(), 0),
    gameProgress
  };
};

export const getContestState = (
  contest: Contest,
  isInMyContests?: boolean,
  userCompletedGames?: boolean,
  currentGameNumber?: number
): ButtonState => {
  const timeStatus = getTimeStatus(contest.start_time, contest.end_time);
  const isContestFull = contest.current_participants >= contest.max_participants;

  // Helper for consistent button styles
  const getButtonStyle = (type: 'primary' | 'secondary' | 'disabled' | 'success') => {
    const styles = {
      primary: "bg-blue-500 hover:bg-blue-600 text-white",
      secondary: "bg-gray-400 text-white cursor-not-allowed",
      disabled: "bg-gray-400 text-white cursor-not-allowed opacity-75",
      success: "bg-green-500 hover:bg-green-600 text-white"
    };
    return styles[type];
  };

  // For completed contests
  if (contest.status === "completed") {
    const isPrizeCalculated = contest.prize_calculation_status === 'completed';
    return {
      text: "View Results",
      variant: "secondary",
      disabled: !isPrizeCalculated,
      showProgress: false,
      customClass: isPrizeCalculated ? getButtonStyle('primary') : getButtonStyle('disabled'),
    };
  }

  // For contests in My Contests
  if (isInMyContests) {
    if (!timeStatus.hasStarted) {
      return {
        text: "Starting Soon",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: getButtonStyle('secondary'),
      };
    }

    if (timeStatus.hasEnded) {
      return {
        text: "Contest Ended",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: getButtonStyle('secondary'),
      };
    }

    if (userCompletedGames) {
      return {
        text: "Games Completed",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: getButtonStyle('primary'),
      };
    }

    // Show current game progress
    const gameNumber = Math.min(
      currentGameNumber ?? timeStatus.currentGameIndex,
      contest.series_count - 1
    ) + 1;
    
    return {
      text: `Game ${gameNumber}/${contest.series_count}`,
      variant: "default",
      disabled: false,
      showProgress: true,
      customClass: getButtonStyle('primary'),
    };
  }

  // For Available Contests
  if (isContestFull) {
    return {
      text: "Contest Full",
      variant: "secondary",
      disabled: true,
      showProgress: false,
      customClass: getButtonStyle('disabled'),
    };
  }

  if (!timeStatus.hasStarted) {
    return {
      text: "Join Contest",
      variant: "default",
      disabled: false,
      showProgress: false,
      customClass: getButtonStyle('success'),
    };
  }

  return {
    text: "Join Now",
    variant: "default",
    disabled: false,
    showProgress: false,
    customClass: getButtonStyle('success'),
  };
};