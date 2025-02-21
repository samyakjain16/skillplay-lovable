import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
export const Hero = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const handleGetStarted = () => {
    if (user) {
      navigate('/contests');
    } else {
      navigate('/auth');
    }
  };
  return <section className="pt-32 pb-20 px-4 rounded-sm">
      <div className="max-w-7xl mx-auto text-center">
        <span className="inline-block animate-fade-in px-4 py-1.5 mb-6 text-sm font-medium bg-primary/10 text-primary rounded-full">
         Join players across Australia and get in on the action!
        </span>
        <h1 className="animate-fade-up text-5xl md:text-7xl font-bold mb-8">
          Play. Compete.
          <span className="text-primary block mt-2">Win Real Money.</span>
        </h1>
        <p className="animate-fade-up animation-delay-100 max-w-2xl mx-auto text-muted text-lg mb-12">
          Join engaging contests and compete for real money prizes.
        </p>
        <div className="animate-fade-up animation-delay-200 flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={handleGetStarted} className="btn-primary inline-flex items-center rounded-md">
            Get Started <ArrowRight className="ml-2" size={20} />
          </button>
          <button className="px-6 py-3 text-secondary font-medium hover:bg-gray-100 rounded-full transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>;
};