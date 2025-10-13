'use server';
/**
 * @fileOverview A secure flow to delete a user from Firebase Authentication.
 *
 * - deleteUser - A function that handles the user deletion process.
 * - DeleteUserInput - The input type for the deleteUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const serviceAccount = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}'
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const DeleteUserInputSchema = z.object({
  userId: z.string().describe('The UID of the user to be deleted.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

// This flow is NOT using an LLM. It's a secure server-side function.
export const deleteUser = ai.defineFlow(
  {
    name: 'deleteUser',
    inputSchema: DeleteUserInputSchema,
    outputSchema: z.void(),
  },
  async ({ userId }) => {
    try {
      await getAuth().deleteUser(userId);
      console.log(`Successfully deleted user with UID: ${userId}`);
    } catch (error: any) {
      console.error(`Error deleting user ${userId}:`, error);
      // Throw an error that can be caught by the calling server action
      throw new Error(`Failed to delete user from Authentication: ${error.message}`);
    }
  }
);
