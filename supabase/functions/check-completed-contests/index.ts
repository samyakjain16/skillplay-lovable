
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function checkCompletedContests() {
  console.log('Checking for completed contests...');

  const { data: contests, error } = await supabase
    .from('contests')
    .select('id')
    .eq('status', 'completed')
    .eq('prize_calculation_status', 'pending');

  if (error) {
    console.error('Error fetching completed contests:', error);
    return;
  }

  console.log(`Found ${contests?.length || 0} contests needing prize distribution`);

  for (const contest of contests || []) {
    try {
      // Call the distribute-contest-prizes function for each contest
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute-contest-prizes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contest_id: contest.id }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to distribute prizes for contest ${contest.id}`);
      }

      console.log(`Successfully initiated prize distribution for contest ${contest.id}`);
    } catch (error) {
      console.error(`Error processing contest ${contest.id}:`, error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await checkCompletedContests();
    
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
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
