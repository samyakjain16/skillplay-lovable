
import { useNavigate } from "react-router-dom";
import { Award, List, FilePlus } from "lucide-react";

export const BottomNav = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="grid grid-cols-3 h-16">
        <button
          onClick={() => navigate("/contests")}
          className="flex flex-col items-center justify-center gap-1"
        >
          <Award className="h-5 w-5" />
          <span className="text-xs">Available Contests</span>
        </button>
        <button
          onClick={() => navigate("/my-contests")}
          className="flex flex-col items-center justify-center gap-1"
        >
          <List className="h-5 w-5" />
          <span className="text-xs">My Contests</span>
        </button>
        <button
          onClick={() => navigate("/create-contest")}
          className="flex flex-col items-center justify-center gap-1"
        >
          <FilePlus className="h-5 w-5" />
          <span className="text-xs">Create Contest</span>
        </button>
      </div>
    </div>
  );
};
