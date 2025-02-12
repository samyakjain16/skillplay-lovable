
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Navigation } from "@/components/Navigation";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-md mx-auto">
          <SupabaseAuth 
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            redirectTo={`${window.location.origin}/auth/callback`}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;
