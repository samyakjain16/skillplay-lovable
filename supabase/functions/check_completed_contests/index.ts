
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Checking for completed contests...')

    // First update contest statuses
    const { error: updateError } = await supabaseClient
      .rpc('check_and_update_contests')

    if (updateError) {
      throw updateError
    }

    // Get contests that need prize distribution
    const { data: completedContests, error: fetchError } = await supabaseClient
      .from('contests')
      .select('id, entry_fee, current_participants, prize_distribution_type')
      .eq('status', 'completed')
      .eq('prize_calculation_status', 'in_progress')

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${completedContests?.length || 0} contests requiring prize distribution`)

    // Process each completed contest
    for (const contest of completedContests || []) {
      try {
        console.log(`Initiating prize distribution for contest ${contest.id}`)
        
        // Call the prize distribution function for each contest
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute_contest_prizes`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contestId: contest.id })
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to distribute prizes for contest ${contest.id}`)
        }

        console.log(`Successfully processed contest ${contest.id}`)
      } catch (error) {
        console.error(`Error processing contest ${contest.id}:`, error)
        
        // Mark the contest as failed if prize distribution fails
        await supabaseClient
          .from('contests')
          .update({ prize_calculation_status: 'failed' })
          .eq('id', contest.id)
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${completedContests?.length || 0} contests`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in check_completed_contests:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
