
import { supabase } from "@/integrations/supabase/client";

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  for (const [userId, prizeAmount] of prizeDistribution.entries()) {
    try {
      // First get current wallet balance
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
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
        // If wallet update fails, mark transaction as failed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      }
    } catch (error) {
      console.error('Error distributing prize to user:', userId, error);
    }
  }
}
