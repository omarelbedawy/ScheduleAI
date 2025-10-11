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
      "A photo of a school schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeScheduleFromImageInput = z.infer<
  typeof AnalyzeScheduleFromImageInputSchema
>;

const ScheduleRowSchema = z.object({
  session: z.string().describe('The session number or "Break 1" / "Break 2".'),
  time: z.string().describe('The time slot for the session.'),
  sunday: z.string().describe('Subject on Sunday.'),
  monday: z.string().describe('Subject on Monday.'),
  tuesday: z.string().describe('Subject on Tuesday.'),
  wednesday: z.string().describe('Subject on Wednesday.'),
  thursday: z.string().describe('Subject on Thursday.'),
});

const AnalyzeScheduleFromImageOutputSchema = z.object({
  schedule: z
    .array(ScheduleRowSchema)
    .describe(
      'An array of objects representing the schedule, with each object being a row.'
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
  prompt: `You are an intelligent timetable parser.
Your task: analyze raw or visual school schedules (that may include half sessions, full sessions, and breaks) and convert them into a structured JSON format. Pay close attention to schedules that might be in a right-to-left language like Arabic.

**Schedule Image to Analyze:**
{{media url=scheduleImage}}

---

**Your Instructions (Follow These Rules Exactly):**

**⚙️ Rules:**
1.  **Sessions:**
    *   There are always 5 sessions per day, numbered 1–5.
    *   Each session = 80 minutes (two halves × 40 min).
    *   Generate 5 session rows max, even if the source has more halves.

2.  **Full vs. Half Sessions:**
    *   If both halves of an 80-minute session are the same subject → write the subject name **only once** (e.g., \`Bio\`).
    *   If the two 40-minute halves have different subjects → write them with a slash (e.g., \`Bio / CAP\`).
    *   **Never** repeat the same subject twice in a row for a single session (e.g., not \`Bio Bio\`, but just \`Bio\`).

3.  **Breaks:**
    *   **Break 1** comes after session 2.
    *   **Break 2** comes after session 4.
    *   Always include these as rows in the output. For break rows, the 'session' field should be "Break 1" or "Break 2", the 'time' field should be empty, and all day fields should be empty strings.

4.  **Leaving Early:**
    *   If the final session (session 5) is only a half session (40 minutes) and students leave afterward, write it like this: **“½ [Subject] + Leave School”**. For example: “½ PE + Leave School”.
    *   If the fifth session on Thursday is completely free/empty, you **must** write **"Leave School"** in that slot.

5.  **Optional Subjects:**
    *   If a slot shows a choice between subjects (e.g., French or German), write them with a slash: **“F / G”**.

6.  **Empty Sessions:**
    *   If a session is completely empty or unscheduled, use a dash (—).

7.  **Subject Codes (Use Only These):**
    *   Arabic, EN, Bio, CH, PH, MATH, MEC, CITZ, ACTV, ADV, CAP, REL, F, G, PE, CS, Geo, SOCIAL.
    *   Use the codes exactly as they appear in the source image if they match this list.

8.  **Output Format (Strictly JSON):**
    *   You **MUST** produce a JSON array of objects in the \`schedule\` field.
    *   Each object represents a row in the schedule.
    *   The structure for each row object must be:
        \`{ "session": "...", "time": "...", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." }\`
    *   Here is the data for the first two sessions and the first break. Complete the rest of the schedule based on the image.
        \`[
          { "session": "1", "time": "7:45–9:05", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "2", "time": "9:05–10:25", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "Break 1", "time": "", "sunday": "", "monday": "", "tuesday": "", "wednesday": "", "thursday": "" },
          { "session": "3", "time": "10:45–12:05", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "4", "time": "12:05–13:25", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." },
          { "session": "Break 2", "time": "", "sunday": "", "monday": "", "tuesday": "", "wednesday": "", "thursday": "" },
          { "session": "5", "time": "13:45–15:00", "sunday": "...", "monday": "...", "tuesday": "...", "wednesday": "...", "thursday": "..." }
        ]\`

**✅ Important "Don'ts":**
*   **Do not** include teacher names.
*   **Do not** repeat identical subjects for a full session (use the subject name only once).
*   Keep capitalization consistent with the subject codes provided.
*   Use ‘/’ for split halves and ‘½’ for single halves followed by leaving.

---

Produce **only** the JSON array in the \`schedule\` field of the output. If you cannot parse the schedule, explain why in the \`errors\` field.`,
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
