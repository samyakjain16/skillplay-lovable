
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  const handleAuthAction = () => {
    if (user) {
      navigate('/gaming');
    } else {
      navigate('/auth');
    }
  };

  const renderAuthButton = () => {
    // On homepage, always show "Start Playing"
    if (isHomePage) {
      return <Button onClick={handleAuthAction}>Start Playing</Button>;
    }
    
    // On other pages, show Sign Out if authenticated
    return user ? (
      <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
    ) : (
      <Button onClick={handleAuthAction}>Start Playing</Button>
    );
  };

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <span className="text-xl font-semibold cursor-pointer" onClick={() => navigate('/')}>SkillPlay</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {renderAuthButton()}
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
            {renderAuthButton()}
          </div>
        </div>
      )}
    </nav>
  );
};
