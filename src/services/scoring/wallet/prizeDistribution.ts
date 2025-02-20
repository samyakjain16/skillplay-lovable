
import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error; // Last retry failed
      await sleep(RETRY_DELAY * (i + 1)); // Exponential backoff
      console.log(`Retrying operation, attempt ${i + 2}/${retries}`);
    }
  }
  throw new Error('Operation failed after all retries');
}

export async function distributePrizes(
  contestId: string,
  prizeDistribution: Map<string, number>
): Promise<void> {
  console.log('Starting prize distribution for contest:', contestId);

  try {
    // Start a transaction for the contest status update
    const { error: updateError } = await supabase
      .from('contests')
      .update({ prize_calculation_status: 'in_progress' })
      .eq('id', contestId);

    if (updateError) {
      throw new Error(`Failed to update contest status: ${updateError.message}`);
    }

    // Process each prize winner
    for (const [userId, prizeAmount] of prizeDistribution.entries()) {
      try {
        console.log(`Processing prize for user ${userId}: $${prizeAmount}`);

        // Get current wallet balance with retry
        const { data: profile, error: profileError } = await retryOperation(async () => 
          await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', userId)
            .single()
        );

        if (profileError || !profile) {
          throw new Error(`Failed to fetch profile for user ${userId}`);
        }

        const newBalance = (profile.wallet_balance || 0) + prizeAmount;

        // Use RPC to handle the transaction atomically on the database side
        const { error: transactionError } = await retryOperation(async () => 
          await supabase.rpc('process_prize_distribution', {
            p_user_id: userId,
            p_contest_id: contestId,
            p_amount: prizeAmount,
            p_new_balance: newBalance
          })
        );

        if (transactionError) {
          throw new Error(`Transaction failed for user ${userId}: ${transactionError.message}`);
        }

        console.log(`Successfully processed prize for user ${userId}. New balance: ${newBalance}`);
      } catch (error) {
        // Log the error but continue processing other users
        console.error(`Failed to process prize for user ${userId}:`, error);
        // We don't throw here to allow other users to receive their prizes
      }
    }

    // Mark contest as completed
    const { error: finalUpdateError } = await retryOperation(async () => 
      await supabase
        .from('contests')
        .update({ prize_calculation_status: 'completed' })
        .eq('id', contestId)
    );

    if (finalUpdateError) {
      throw new Error(`Failed to update final contest status: ${finalUpdateError.message}`);
    }

    console.log('Prize distribution completed successfully for contest:', contestId);
  } catch (error) {
    console.error('Prize distribution failed:', error);
    // Try to mark the contest as failed
    await supabase
      .from('contests')
      .update({ prize_calculation_status: 'failed' })
      .eq('id', contestId);
    throw error; // Re-throw to notify callers
  }
}
