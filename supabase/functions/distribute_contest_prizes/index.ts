import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or key');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    // Fetch contests that are completed but prize calculation is pending
    const { data: contests, error: contestsError } = await supabase
      .from('contests')
      .select('*')
      .eq('status', 'completed')
      .eq('prize_calculation_status', 'pending');

    if (contestsError) {
      console.error('Error fetching contests:', contestsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch contests' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contests || contests.length === 0) {
      console.log('No contests found for prize distribution.');
      return new Response(JSON.stringify({ message: 'No contests to process' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${contests.length} contests to process.`);

    for (const contest of contests) {
      try {
        // Update contest status to 'in_progress'
        const { error: updateError } = await supabase
          .from('contests')
          .update({ prize_calculation_status: 'in_progress' })
          .eq('id', contest.id);

        if (updateError) {
          console.error(`Error updating contest ${contest.id} status:`, updateError);
          continue; // Move to the next contest
        }

        console.log(`Calculating prizes for contest: ${contest.id}`);

        // Call the calculate_prize_distribution function
        const calculatePrizes = async (contestId: string, totalPrizePool: number, distributionType: string) => {
          const { data, error } = await supabase.functions.invoke('calculate-prize-distribution', {
            body: {
              contestId: contestId,
              totalPrizePool: totalPrizePool,
              distributionType: distributionType,
            },
          });

          if (error) {
            throw error;
          }

          return data;
        };

        await calculatePrizes(contest.id, contest.prize_pool, contest.prize_distribution_type);

      } catch (error) {
        console.error(`Error processing contest ${contest.id}:`, error);

        // Update contest status to 'failed'
        await supabase
          .from('contests')
          .update({ prize_calculation_status: 'failed' })
          .eq('id', contest.id);
      }
    }

    return new Response(JSON.stringify({ message: 'Prize distribution process completed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
