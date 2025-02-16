
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
      // Clear any local session data first
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          title: "Error signing out",
          description: error.message
        });
      } else {
        // Successfully signed out
        toast({
          title: "Signed out",
          description: "You have been successfully signed out"
        });
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "An unexpected error occurred"
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
