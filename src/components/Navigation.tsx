import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-xl font-semibold">SkillPlay</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="nav-link">Home</a>
            <a href="#" className="nav-link">Contests</a>
            <a href="#" className="nav-link">Leaderboard</a>
            <button className="btn-primary">Start Playing</button>
          </div>
          
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">Home</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">Contests</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">Leaderboard</a>
            <button className="w-full mt-4 btn-primary">Start Playing</button>
          </div>
        </div>
      )}
    </nav>
  );
};