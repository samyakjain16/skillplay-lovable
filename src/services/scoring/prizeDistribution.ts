
import { supabase } from "@/integrations/supabase/client";
import { calculatePrizeDistribution } from "./calculatePrizes";
import { getPrizeDistributionDetails } from "./distributionModels";

/**
 * Distributes prizes to users and updates wallet balances
 * 
 * Note: This should be called from server-side context or with service role permissions.
 * If RLS errors occur, consider moving this to a Supabase Edge Function.
 */
export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  const client = supabase;

  try {
    // First check if the contest is in a valid state for prize distribution
    const { data: contest, error: contestError } = await client
      .from('contests')
      .select('prize_calculation_status, status')
      .eq('id', contestId)
      .single();

    if (contestError) throw contestError;

    if (contest.prize_calculation_status === 'completed') {
      console.log('Prizes already distributed for contest:', contestId);
      return;
    }

    if (contest.status !== 'completed') {
      throw new Error('Cannot distribute prizes for non-completed contest');
    }

    // Set status to in_progress if it's still pending
    if (contest.prize_calculation_status === 'pending') {
      const { error: statusError } = await client
        .from('contests')
        .update({ prize_calculation_status: 'in_progress' })
        .eq('id', contestId);

      if (statusError) throw statusError;
    }

    // Instead of processing prizes directly, trigger the database function that has service role permissions
    // This is more reliable and avoids RLS issues
    try {
      const { data, error } = await client
        .rpc('distribute_contest_prizes', { contest_id: contestId });
      
      if (error) {
        console.error('Error calling distribute_contest_prizes function:', error);
        throw error;
      }
      
      console.log('Prize distribution triggered successfully:', data);
      return;
    } catch (rpcError) {
      console.error('Failed to trigger prize distribution via RPC:', rpcError);
      // Fall back to client-side distribution if RPC fails
    }

    // Client-side fallback distribution (will likely hit RLS errors if not authenticated as admin)
    console.warn('Falling back to client-side prize distribution - this may fail due to permissions');
    
    // Process each winner's prize
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      // Skip if zero prize (shouldn't happen but just to be safe)
      if (prizeAmount <= 0) continue;

      // Get current wallet balance
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        continue;
      }

      // Check if transaction already exists to prevent duplicates
      const { data: existingTransaction } = await client
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reference_id', contestId)
        .eq('type', 'prize_payout')
        .maybeSingle();

      if (existingTransaction) {
        console.log('Prize already distributed to user:', userId);
        continue;
      }

      // Create transaction record
      const { error: transactionError } = await client
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: prizeAmount,
          type: 'prize_payout',
          reference_id: contestId,
          status: 'completed'
        });

      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        continue;
      }

      // Update wallet balance
      const { error: updateError } = await client
        .from('profiles')
        .update({ 
          wallet_balance: profile.wallet_balance + prizeAmount
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
      }
    }

    // Mark prize calculation as completed
    const { error: finalStatusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId);

    if (finalStatusError) {
      throw finalStatusError;
    }

  } catch (error) {
    console.error('Error during prize distribution:', error);
    // Try to revert status to pending if something went wrong
    try {
      await client
        .from('contests')
        .update({ prize_calculation_status: 'pending' })
        .eq('id', contestId);
    } catch (revertError) {
      console.error('Error reverting prize calculation status:', revertError);
    }
    throw error;
  }
}

// Re-export functions from other files to maintain the same API
export { calculatePrizeDistribution, getPrizeDistributionDetails };
