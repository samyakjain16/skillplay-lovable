import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
export const Footer = () => {
  return <footer className="bg-gray-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">About SkillPlay</h3>
            <p className="text-gray-600">Join the ultimate casual games contests where players compete and win real money prizes.</p>
          </div>
          
          <div className="mx-[20px]">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="text-gray-600 hover:text-gray-900">About Us</a></li>
              <li><a href="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a></li>
              <li><a href="/tournaments" className="text-gray-600 hover:text-gray-900">Tournaments</a></li>
              <li><a href="/contact" className="text-gray-600 hover:text-gray-900">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
              <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
              <li><a href="/rules" className="text-gray-600 hover:text-gray-900">Game Rules</a></li>
              <li><a href="/responsible-gaming" className="text-gray-600 hover:text-gray-900">Responsible Gaming</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <Linkedin size={24} />
              </a>
            </div>
            <div className="mt-4">
              <p className="text-gray-600">Email: support@skillplay.com</p>
              <p className="text-gray-600">Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-gray-600">
            © {new Date().getFullYear()} SkillPlay. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
};