import { z } from 'zod';

const required = (name: string) => z.string({ error: `${name} is required` }).min(1, `${name} is required`);

const BaseSchema = z.object({
  DATABASE_USER: required('DATABASE_USER'),
  DATABASE_PASSWORD: required('DATABASE_PASSWORD'),
  DATABASE_NAME: required('DATABASE_NAME'),
  SESSION_SECRET: required('SESSION_SECRET'),
  QR_SECRET: required('QR_SECRET'),
  ADMIN_NUMBERS: required('ADMIN_NUMBERS'),
});

// In production the console SMS adapter would silently swallow OTPs while the
// API still reports success — refuse to run unless Text.lk is fully configured.
const ProductionSchema = BaseSchema.extend({
  SMS_PROVIDER: z.literal('textlk', {
    error: 'SMS_PROVIDER must be "textlk" in production (the console adapter only logs OTPs, it does not send SMS)',
  }),
  TEXTLK_API_TOKEN: required('TEXTLK_API_TOKEN'),
  TEXTLK_SENDER_ID: required('TEXTLK_SENDER_ID'),
  TEXTLK_API_URL: required('TEXTLK_API_URL'),
});

function validateEnv(): void {
  // `next build` runs with NODE_ENV=production on the dev machine, where the
  // dev .env.local (SMS_PROVIDER=console) is loaded — only enforce at runtime.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const schema = process.env.NODE_ENV === 'production' ? ProductionSchema : BaseSchema;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
}

validateEnv();
