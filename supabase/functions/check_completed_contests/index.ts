import { serve } from 'std/server';
import { differenceInMinutes } from 'date-fns';

async function checkAndHandleCompletedContests() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not provided in environment variables');
    return;
  }

  const now = new Date();
  const apiUrl = `${supabaseUrl}/rest/v1/contests`;

  try {
    // Fetch contests that are marked as 'in_progress' but whose end_time has passed
    const response = await fetch(`${apiUrl}?status=in_progress&end_time=lt.${now.toISOString()}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch contests:', response.status, response.statusText);
      return;
    }

    const contests = await response.json();

    if (!Array.isArray(contests) || contests.length === 0) {
      console.log('No contests found that need completion check.');
      return;
    }

    console.log(`Found ${contests.length} contests to check.`);

    for (const contest of contests) {
      try {
        // Check if prize calculation is already in progress or completed
        if (contest.prize_calculation_status === 'in_progress' || contest.prize_calculation_status === 'completed') {
          console.log(`Contest ${contest.id} prize calculation already in progress or completed, skipping.`);
          continue;
        }

        // Mark contest as completed
        const updateResponse = await fetch(`${apiUrl}?id=eq.${contest.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal', // Suppress the return of updated data
          },
          body: JSON.stringify({
            status: 'completed',
            prize_calculation_status: 'in_progress',
          }),
        });

        if (!updateResponse.ok) {
          console.error(`Failed to update contest ${contest.id}:`, updateResponse.status, updateResponse.statusText);
          continue;
        }

        console.log(`Contest ${contest.id} marked as completed. Starting prize distribution...`);

        // Call the distribute_contest_prizes function
        const functionUrl = `${supabaseUrl}/functions/v1/distribute_contest_prizes`;
        const functionResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contestId: contest.id }),
        });

        if (!functionResponse.ok) {
          console.error(`Failed to call distribute_contest_prizes for contest ${contest.id}:`, functionResponse.status, functionResponse.statusText);

           // If prize distribution fails, mark contest as failed
           const failResponse = await fetch(`${apiUrl}?id=eq.${contest.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal', // Suppress the return of updated data
            },
            body: JSON.stringify({
              prize_calculation_status: 'failed',
            }),
          });

          if (!failResponse.ok) {
            console.error(`Failed to mark contest ${contest.id} as failed:`, failResponse.status, failResponse.statusText);
          }

          continue;
        }

        console.log(`Prize distribution started for contest ${contest.id}`);
      } catch (error) {
        console.error(`Error processing contest ${contest.id}:`, error);

         // If prize distribution fails, mark contest as failed
         const failResponse = await fetch(`${apiUrl}?id=eq.${contest.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal', // Suppress the return of updated data
          },
          body: JSON.stringify({
            prize_calculation_status: 'failed',
          }),
        });

        if (!failResponse.ok) {
          console.error(`Failed to mark contest ${contest.id} as failed after error:`, failResponse.status, failResponse.statusText);
        }
      }
    }
  } catch (error) {
    console.error('Failed to check and handle completed contests:', error);
  }
}

serve(async (req) => {
  if (req.method === 'POST') {
    console.log('Running scheduled check for completed contests...');
    await checkAndHandleCompletedContests();
    return new Response(JSON.stringify({ message: 'Contest completion check initiated.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    return new Response('Method not allowed', { status: 405 });
  }
});
