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
  prompt: `You are an intelligent timetable parser.
Your task: analyze raw or visual school schedules (that may include half sessions, full sessions, and breaks) and convert them into a clean, standardized table format.

**Schedule Image to Analyze:**
{{media url=scheduleImage}}

---

**Your Instructions (Follow These Rules Exactly):**

**⚙️ Rules:**
1.  **Sessions:**
    *   There are always 5 sessions per day, numbered 1–5.
    *   Each session = 80 minutes (two halves × 40 min).
    *   Write 5 sessions max, even if the source has more halves.

2.  **Full vs. Half Sessions:**
    *   If both halves of an 80-minute session are the same subject → write the subject name **only once** (e.g., \`Bio\`).
    *   If the two 40-minute halves have different subjects → write them with a slash (e.g., \`Bio / CAP\`).
    *   **Never** repeat the same subject twice in a row for a single session (e.g., not \`Bio Bio\`, but just \`Bio\`).

3.  **Breaks:**
    *   **Break 1** comes after session 2.
    *   **Break 2** comes after session 4.
    *   Always include these as rows in the table, labeled **“Break 1”** and **“Break 2”**.

4.  **Leaving Early:**
    *   If the final session is only a half session (40 minutes) and students leave afterward, write it like this: **“½ [Subject] + Leave School”**. For example: “½ PE + Leave School”.

5.  **Optional Subjects:**
    *   If a slot shows a choice between subjects (e.g., French or German), write them with a slash: **“F / G”**.

6.  **Empty Sessions:**
    *   If a session is completely empty or unscheduled, use a dash (—).

7.  **Subject Codes (Use Only These):**
    *   Arabic, EN, Bio, CH, PH, MATH, MEC, CITZ, ACTV, ADV, CAP, REL, F, G, PE.
    *   Use the codes exactly as they appear in the source image if they match this list.

8.  **Output Format (Strictly Markdown Table):**
    *   You **MUST** use the following Markdown table structure.

| Session | Time        | Sunday | Monday | Tuesday | Wednesday | Thursday |
| :------ | :---------- | :----- | :----- | :------ | :-------- | :------- |
| 1       | 7:45–9:05   | ...    | ...    | ...     | ...       | ...      |
| 2       | 9:05–10:25  | ...    | ...    | ...     | ...       | ...      |
|         | **Break 1** |        |        |         |           |          |
| 3       | 10:45–12:05 | ...    | ...    | ...     | ...       | ...      |
| 4       | 12:05–13:25 | ...    | ...    | ...     | ...       | ...      |
|         | **Break 2** |        |        |         |           |          |
| 5       | 13:45–15:00 | ...    | ...    | ...     | ...       | ...      |


**✅ Important "Don'ts":**
*   **Do not** merge cells vertically. Each session is its own row.
*   **Do not** include teacher names.
*   **Do not** repeat identical subjects for a full session (use the subject name only once).
*   Keep capitalization consistent with the subject codes provided.
*   Use ‘/’ for split halves and ‘½’ for single halves followed by leaving.

---

Produce **only** the Markdown table in the \`schedule\` field of the output. If you cannot parse the schedule, explain why in the \`errors\` field.`,
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
