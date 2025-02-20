
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client using the service role key (full admin access)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function calculateAndDistributePrizes(contestId: string) {
  console.log('Starting prize distribution for contest:', contestId);

  try {
    // Get contest details
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (contestError) throw contestError;
    if (!contest) throw new Error('Contest not found');

    // Check if prizes were already distributed
    const { data: existingPrizes } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount')
      .eq('reference_id', contestId)
      .eq('type', 'prize_payout');

    if (existingPrizes && existingPrizes.length > 0) {
      console.log('Prizes already distributed for contest:', contestId);
      return;
    }

    // Get final rankings
    const { data: rankings, error: rankingsError } = await supabase
      .rpc('get_contest_leaderboard', { contest_id: contestId });

    if (rankingsError) throw rankingsError;
    if (!rankings || rankings.length === 0) {
      console.log('No rankings found for contest:', contestId);
      return;
    }

    // Get prize distribution model
    const { data: models, error: modelsError } = await supabase
      .from('prize_distribution_models')
      .select('*')
      .eq('name', contest.prize_distribution_type)
      .eq('is_active', true)
      .single();

    if (modelsError) throw modelsError;
    if (!models) throw new Error('Prize distribution model not found');

    const prizeDistribution = new Map<string, number>();
    const totalPrizePool = contest.prize_pool;

    // Calculate prize amounts based on ranking
    rankings.forEach((ranking, index) => {
      const rank = (index + 1).toString();
      const percentage = models.distribution_rules[rank];
      
      if (percentage) {
        const prizeAmount = Math.floor((totalPrizePool * percentage) / 100);
        if (prizeAmount > 0) {
          prizeDistribution.set(ranking.user_id, prizeAmount);
          console.log(`Calculated prize for rank ${rank}:`, prizeAmount);
        }
      }
    });

    // Distribute prizes
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      try {
        // Get current wallet balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching wallet balance:', profileError);
          continue;
        }

        const newBalance = (profile.wallet_balance || 0) + prizeAmount;

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            amount: prizeAmount,
            type: 'prize_payout',
            reference_id: contestId,
            status: 'completed'
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          continue;
        }

        // Update wallet balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating wallet balance:', updateError);
          await supabase
            .from('wallet_transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id);
        }
      } catch (error) {
        console.error('Error processing prize for user:', userId, error);
      }
    }

    // Mark prize distribution as completed
    await supabase
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId);

    console.log('Prize distribution completed successfully for contest:', contestId);

  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Mark as failed
    await supabase
      .from('contests')
      .update({ prize_calculation_status: 'failed' })
      .eq('id', contestId);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contest_id } = await req.json();
    
    if (!contest_id) {
      throw new Error('contest_id is required');
    }

    await calculateAndDistributePrizes(contest_id);

    return new Response(
      JSON.stringify({ success: true }), 
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
