
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client using the service role key (full admin access)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contestId } = await req.json();
    
    if (!contestId) {
      throw new Error('Contest ID is required');
    }

    console.log('Processing prize distribution for contest:', contestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get contest details
    const { data: contest, error: contestError } = await supabaseClient
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (contestError) throw contestError;
    if (!contest) throw new Error('Contest not found');

    // Calculate total prize pool
    const totalPrizePool = (contest.entry_fee || 0) * (contest.current_participants || 0);
    console.log('Total prize pool:', totalPrizePool);

    // Get distribution model
    const { data: distributionModel, error: modelError } = await supabaseClient
      .from('prize_distribution_models')
      .select('*')
      .eq('name', contest.prize_distribution_type)
      .eq('is_active', true)
      .single();

    if (modelError) throw modelError;
    if (!distributionModel) throw new Error('Distribution model not found');

    // Get final rankings
    const { data: rankings, error: rankingsError } = await supabaseClient
      .rpc('get_contest_leaderboard', { contest_id: contestId });

    if (rankingsError) throw rankingsError;
    if (!rankings || rankings.length === 0) {
      throw new Error('No rankings found for contest');
    }

    console.log('Processing rankings for prize distribution');

    // Calculate and distribute prizes
    const prizeDistribution = new Map();
    rankings.forEach((ranking, index) => {
      const rank = (index + 1).toString();
      const percentage = distributionModel.distribution_rules[rank];
      
      if (percentage) {
        const prizeAmount = Math.floor((totalPrizePool * percentage) / 100);
        if (prizeAmount > 0) {
          prizeDistribution.set(ranking.user_id, prizeAmount);
          console.log(`Calculated prize for rank ${rank}:`, prizeAmount);
        }
      }
    });

    // Distribute prizes to winners
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      try {
        // Get current wallet balance
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        const newBalance = (profile.wallet_balance || 0) + prizeAmount;

        // Create transaction record
        const { error: transactionError } = await supabaseClient
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            amount: prizeAmount,
            type: 'prize_payout',
            reference_id: contestId,
            status: 'completed'
          });

        if (transactionError) throw transactionError;

        // Update wallet balance
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId);

        if (updateError) throw updateError;
        
        console.log(`Successfully distributed ${prizeAmount} to user ${userId}`);
      } catch (error) {
        console.error(`Error distributing prize to user ${userId}:`, error);
        throw error;
      }
    }

    // Mark contest as completed
    const { error: updateError } = await supabaseClient
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true,
      message: `Successfully distributed prizes for contest ${contestId}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in distribute_contest_prizes:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
