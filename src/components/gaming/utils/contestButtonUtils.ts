
type ButtonState = {
  text: string;
  variant: "default" | "secondary" | "destructive";
  disabled: boolean;
  showProgress: boolean;
  customClass: string;
};

type TimeStatus = {
  hasStarted: boolean;
  hasEnded: boolean;
  progress: number;
  currentGameIndex: number;
  remainingTime: number;
};

export const getTimeStatus = (startTime: string, endTime: string): TimeStatus => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const currentGameIndex = Math.floor(elapsed / 30000); // 30 seconds per game
  const hasEnded = now > end;
  
  return {
    hasStarted: now >= start,
    hasEnded,
    progress: Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100),
    currentGameIndex: hasEnded ? 0 : currentGameIndex,
    remainingTime: end.getTime() - now.getTime()
  };
};

export const getContestState = (
  contest: {
    status: string;
    start_time: string;
    end_time: string;
    current_participants: number;
    max_participants: number;
    series_count: number;
    prize_calculation_status?: string;
  },
  isInMyContests?: boolean,
  userCompletedGames?: boolean
): ButtonState => {
  const { hasStarted, hasEnded } = getTimeStatus(
    contest.start_time,
    contest.end_time
  );
  const isContestFull = contest.current_participants >= contest.max_participants;

  // For completed contests
  if (contest.status === "completed") {
    // Prize calculation in progress
    if (contest.prize_calculation_status === 'in_progress') {
      return {
        text: "Calculating Results...",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: "bg-gray-400 text-white cursor-not-allowed opacity-75",
      };
    }
    // Prize calculation completed
    if (contest.prize_calculation_status === 'completed') {
      return {
        text: "View Results",
        variant: "secondary",
        disabled: false,
        showProgress: false,
        customClass: "bg-primary hover:bg-primary/90 text-white",
      };
    }
    // Prize calculation failed or pending
    return {
      text: "Processing Results",
      variant: "secondary",
      disabled: true,
      showProgress: false,
      customClass: "bg-gray-400 text-white cursor-not-allowed",
    };
  }

  // For contests that have ended but not marked as completed
  if (hasEnded) {
    return {
      text: "Contest Ended",
      variant: "secondary",
      disabled: true,
      showProgress: false,
      customClass: "bg-gray-400 text-white cursor-not-allowed opacity-75",
    };
  }

  // For contests in My Contests
  if (isInMyContests) {
    if (!hasStarted) {
      return {
        text: "Starting Soon",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: "bg-gray-400 text-white cursor-not-allowed",
      };
    }

    if (userCompletedGames) {
      return {
        text: "Games Completed",
        variant: "secondary",
        disabled: true,
        showProgress: false,
        customClass: "bg-blue-600 text-white",
      };
    }

    return {
      text: "Continue Playing",
      variant: "default",
      disabled: false,
      showProgress: true,
      customClass: "bg-blue-500 hover:bg-blue-600 text-white",
    };
  }

  // For Available Contests
  if (isContestFull) {
    return {
      text: "Contest Full",
      variant: "secondary",
      disabled: true,
      showProgress: false,
      customClass: "bg-gray-600 text-white",
    };
  }

  if (!hasStarted) {
    return {
      text: "Join Contest",
      variant: "default",
      disabled: false,
      showProgress: false,
      customClass: "bg-green-500 hover:bg-green-600 text-white",
    };
  }

  return {
    text: "Join Now",
    variant: "default",
    disabled: false,
    showProgress: false,
    customClass: "bg-green-500 hover:bg-green-600 text-white",
  };
};
