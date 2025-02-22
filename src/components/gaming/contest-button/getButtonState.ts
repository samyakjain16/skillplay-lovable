
import { ButtonState } from "./types";

export const getButtonState = (
  isInMyContests: boolean | undefined,
  contestType: string,
  currentParticipants: number,
  maxParticipants: number,
  status: string,
  userCompletedGames: boolean | undefined,
  seriesCount: number,
  currentGameNumber: number | null
): ButtonState => {
  let buttonText = "Join Contest";
  if (!isInMyContests && contestType === 'fixed_participants') {
    buttonText = `Join (${currentParticipants}/${maxParticipants})`;
  }

  const buttonState: ButtonState = {
    text: buttonText,
    variant: "default",
    disabled: false,
    showProgress: status === "in_progress",
    customClass: "bg-green-500 hover:bg-green-600 text-white"
  };

  if (isInMyContests) {
    const isWaitingForPlayers = 
      contestType === 'fixed_participants' && 
      currentParticipants < maxParticipants;

    if (isWaitingForPlayers) {
      buttonState.text = `Waiting for Players (${currentParticipants}/${maxParticipants})`;
      buttonState.disabled = true;
      buttonState.customClass = "bg-gray-400 text-white cursor-not-allowed";
    } else if (status === "completed") {
      buttonState.text = "View Leaderboard";
      buttonState.variant = "default";
      buttonState.customClass = "bg-gray-600 hover:bg-gray-700 text-white";
    } else if (userCompletedGames) {
      buttonState.text = "Games Completed";
      buttonState.disabled = true;
      buttonState.customClass = "bg-blue-600 text-white";
    } else if (status === "in_progress") {
      buttonState.text = currentGameNumber 
        ? `Continue Game ${currentGameNumber}/${seriesCount}`
        : "Continue Playing";
      buttonState.customClass = "bg-blue-500 hover:bg-blue-600 text-white";
    } else {
      buttonState.text = "Start Playing";
      buttonState.customClass = "bg-blue-500 hover:bg-blue-600 text-white";
    }
  } else {
    if (currentParticipants >= maxParticipants) {
      buttonState.text = "Contest Full";
      buttonState.variant = "default";
      buttonState.disabled = true;
      buttonState.customClass = "bg-gray-600 text-white";
    }
  }

  return buttonState;
};
