'use server';

/**
 * @fileOverview Analyzes a school schedule image to extract subjects, times, and days.
 *
 * - analyzeScheduleFromImage - A function that handles the schedule analysis process.
 * - AnalyzeScheduleFromImageInput - The input type for the analyzeScheduleFromImage function.
 * - AnalyzeScheduleFromImageOutput - The return type for the analyzeScheduleFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeScheduleFromImageInputSchema = z.object({
  scheduleImage: z
    .string()
    .describe(
      'A photo of a school schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type AnalyzeScheduleFromImageInput = z.infer<
  typeof AnalyzeScheduleFromImageInputSchema
>;

const AnalyzeScheduleFromImageOutputSchema = z.object({
  schedule: z
    .string()
    .describe(
      'The extracted schedule in a structured, easily readable format, with clear delineation of days and class times.'
    ),
  errors: z
    .string()
    .optional()
    .describe(
      'Any errors or ambiguities found in the schedule, or empty string if no errors found.'
    ),
});
export type AnalyzeScheduleFromImageOutput = z.infer<
  typeof AnalyzeScheduleFromImageOutputSchema
>;

export async function analyzeScheduleFromImage(
  input: AnalyzeScheduleFromImageInput
): Promise<AnalyzeScheduleFromImageOutput> {
  return analyzeScheduleFromImageFlow(input);
}

const analyzeScheduleFromImagePrompt = ai.definePrompt({
  name: 'analyzeScheduleFromImagePrompt',
  input: {schema: AnalyzeScheduleFromImageInputSchema},
  output: {schema: AnalyzeScheduleFromImageOutputSchema},
  prompt: `You are an AI assistant designed to extract and structure information from school schedules. Given an image of a schedule, extract the subjects, times, and days. Present the schedule in a clear, tabular format with days as columns and times as rows. Identify any potential errors or ambiguities in the schedule.

Schedule Image: {{media url=scheduleImage}}

Output the schedule in a structured format that is easy to read and copy-paste.
If there are errors make sure to describe them clearly in the "errors" field, otherwise the field should be an empty string.
`,
});

const analyzeScheduleFromImageFlow = ai.defineFlow(
  {
    name: 'analyzeScheduleFromImageFlow',
    inputSchema: AnalyzeScheduleFromImageInputSchema,
    outputSchema: AnalyzeScheduleFromImageOutputSchema,
  },
  async input => {
    const {output} = await analyzeScheduleFromImagePrompt(input);
    return output!;
  }
);
