
import { Award, List, FilePlus } from "lucide-react";

type TabType = "available" | "my-contests" | "create";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="grid grid-cols-3 h-16">
        <button
          onClick={() => onTabChange("available")}
          className={`flex flex-col items-center justify-center ${
            activeTab === "available" 
              ? "bg-primary text-white" 
              : "bg-white text-gray-500"
          }`}
        >
          <Award className="h-5 w-5" />
          <span className="text-xs mt-1">Available Contests</span>
        </button>
        <button
          onClick={() => onTabChange("my-contests")}
          className={`flex flex-col items-center justify-center ${
            activeTab === "my-contests" 
              ? "bg-primary text-white" 
              : "bg-white text-gray-500"
          }`}
        >
          <List className="h-5 w-5" />
          <span className="text-xs mt-1">My Contests</span>
        </button>
        <button
          onClick={() => onTabChange("create")}
          className={`flex flex-col items-center justify-center ${
            activeTab === "create" 
              ? "bg-primary text-white" 
              : "bg-white text-gray-500"
          }`}
        >
          <FilePlus className="h-5 w-5" />
          <span className="text-xs mt-1">Create Contest</span>
        </button>
      </div>
    </div>
  );
};
