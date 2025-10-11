
'use server';

import { analyzeScheduleFromImage, AnalyzeScheduleFromImageInput, AnalyzeScheduleFromImageOutput } from '@/ai/flows/analyze-schedule-from-image';

/**
 * A server action that analyzes a schedule image using the Genkit AI flow.
 * @param input The image data as a base64-encoded string.
 * @returns A promise that resolves to the analyzed schedule data or an error object.
 */
export async function analyzeScheduleAction(
  input: AnalyzeScheduleFromImageInput
): Promise<AnalyzeScheduleFromImageOutput> {
  try {
    const result = await analyzeScheduleFromImage(input);
    return result;
  } catch (e) {
    console.error('Error analyzing schedule:', e);
    // Return a structured error that the client can display
    return {
      schedule: '',
      errors: 'An unexpected error occurred while analyzing the schedule. The AI model might be unavailable or the image format could be unsupported. Please try again later.'
    };
  }
}
