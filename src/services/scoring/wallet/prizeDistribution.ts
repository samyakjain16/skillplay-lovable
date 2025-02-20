
import { supabase } from "@/integrations/supabase/client";

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  console.log('Starting prize distribution for contest:', contestId);

  // First update contest status to indicate prize distribution has started
  const { error: updateError } = await supabase
    .from('contests')
    .update({ prize_calculation_status: 'in_progress' })
    .eq('id', contestId);

  if (updateError) {
    console.error('Error updating contest status:', updateError);
    return;
  }

  for (const [userId, prizeAmount] of prizeDistribution.entries()) {
    try {
      console.log(`Processing prize for user ${userId}: $${prizeAmount}`);
      
      // Get current wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching current balance:', profileError);
        continue;
      }

      const newBalance = (profile.wallet_balance || 0) + prizeAmount;

      // Create transaction record first
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
        console.error('Error creating transaction record:', transactionError);
        continue;
      }

      // Update wallet balance with new calculated value
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (balanceError) {
        console.error('Error updating wallet balance:', balanceError);
        // If wallet update fails, mark transaction as failed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      } else {
        console.log(`Successfully updated wallet balance for user ${userId} to ${newBalance}`);
      }
    } catch (error) {
      console.error('Error distributing prize to user:', userId, error);
    }
  }

  // Update contest status to completed after all prizes are distributed
  const { error: finalUpdateError } = await supabase
    .from('contests')
    .update({ prize_calculation_status: 'completed' })
    .eq('id', contestId);

  if (finalUpdateError) {
    console.error('Error updating final contest status:', finalUpdateError);
  } else {
    console.log('Prize distribution completed successfully for contest:', contestId);
  }
}
