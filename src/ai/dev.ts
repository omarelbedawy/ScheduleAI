import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-schedule-from-image.ts';
import '@/ai/flows/flag-schedule-ambiguities.ts';
