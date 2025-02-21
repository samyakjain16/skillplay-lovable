
import { supabase } from "@/integrations/supabase/client";

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  const client = supabase;

  try {
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

    const { error: statusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'in_progress' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'pending');

    if (statusError) throw statusError;

    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        continue;
      }

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

    const { error: finalStatusError } = await client
      .from('contests')
      .update({ prize_calculation_status: 'completed' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'in_progress');

    if (finalStatusError) {
      throw finalStatusError;
    }

  } catch (error) {
    console.error('Error during prize distribution:', error);
    await client
      .from('contests')
      .update({ prize_calculation_status: 'pending' })
      .eq('id', contestId)
      .eq('prize_calculation_status', 'in_progress');
    throw error;
  }
}
