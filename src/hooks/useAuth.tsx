
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // First clear the session state
      setSession(null);

      // Clear all session data from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      });

      // Attempt to sign out from Supabase
      await supabase.auth.signOut();

      toast({
        title: "Signed out",
        description: "You have been successfully signed out"
      });

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, we've already cleared the local state
      toast({
        title: "Signed out",
        description: "Session has been cleared"
      });
      navigate('/');
    }
  };

  return {
    session,
    loading,
    user: session?.user ?? null,
    signOut,
  };
};
