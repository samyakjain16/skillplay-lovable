
interface ContestProgressBarProps {
  progress: number;
}

export const ContestProgressBar = ({ progress }: ContestProgressBarProps) => {
  return (
    <div 
      className="absolute left-0 top-0 h-full bg-opacity-20 bg-black transition-all duration-500"
      style={{ width: `${progress}%` }}
    />
  );
};
