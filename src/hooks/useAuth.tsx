
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      // First clear all session data from localStorage
      window.localStorage.removeItem('supabase.auth.token');
      window.localStorage.removeItem('supabase.auth.expires_at');
      window.localStorage.removeItem('supabase.auth.refresh_token');
      
      // Clear the session state
      setSession(null);

      // Then attempt to sign out from Supabase
      await supabase.auth.signOut();

      toast({
        title: "Signed out",
        description: "You have been successfully signed out"
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      toast({
        title: "Signed out",
        description: "Session has been cleared"
      });
    }
  };

  return {
    session,
    loading,
    user: session?.user ?? null,
    signOut,
  };
};
