
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
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "available" ? "text-primary" : "text-gray-500"
          }`}
        >
          <Award className="h-5 w-5" />
          <span className="text-xs">Available Contests</span>
        </button>
        <button
          onClick={() => onTabChange("my-contests")}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "my-contests" ? "text-primary" : "text-gray-500"
          }`}
        >
          <List className="h-5 w-5" />
          <span className="text-xs">My Contests</span>
        </button>
        <button
          onClick={() => onTabChange("create")}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTab === "create" ? "text-primary" : "text-gray-500"
          }`}
        >
          <FilePlus className="h-5 w-5" />
          <span className="text-xs">Create Contest</span>
        </button>
      </div>
    </div>
  );
};
