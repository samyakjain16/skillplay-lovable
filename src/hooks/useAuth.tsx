
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
      // Only attempt to sign out if we have a session
      if (!session) {
        setSession(null);
        toast({
          title: "Already signed out",
          description: "No active session found"
        });
        return;
      }

      const { error } = await supabase.auth.signOut({
        scope: 'local'  // Use local scope to avoid session validation on server
      });
      
      if (error) {
        console.error('Sign out error:', error);
        toast({
          variant: "destructive",
          title: "Error signing out",
          description: error.message
        });
      } else {
        setSession(null);
        toast({
          title: "Signed out",
          description: "You have been successfully signed out"
        });
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force clear the session even if there's an error
      setSession(null);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "An unexpected error occurred, but session has been cleared locally"
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
