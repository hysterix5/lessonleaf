# Lessonleaf

A lesson planning app modeled on `public/Lesson Plan sample.pdf`. The sample is a Grade 1 Science plan with an eight-week course outline and detailed weekly sections. Lessonleaf creates editable drafts with its built-in Smart Template or AI generation using Groq GPT-OSS and Google Gemini models.

## Setup

1. In your Supabase project's SQL Editor, run the migrations in `supabase/migrations` in date order. For an existing installation, apply [`20260928_create_ai_usage.sql`](supabase/migrations/20260928_create_ai_usage.sql) to enable private API usage records and the developer dashboard.
2. Set these variables in this app directory's `.env` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   GROQ_API_KEY=your-groq-api-key
   GEMINI_API_KEY=your-google-ai-studio-api-key
   SUPABASE_SECRET_KEY=your-supabase-secret-key
   DEVELOPER_SECRET_KEY=your-random-secret-of-at-least-32-characters
   ```

   The browser connects directly to Supabase using the publishable key and each signed-in user's session. The server uses `SUPABASE_SECRET_KEY` only to write API usage records and read aggregated usage. The separate `DEVELOPER_SECRET_KEY` unlocks the Developer page through an eight-hour, HttpOnly session cookie. Generate a random key of at least 32 characters and never prefix either secret with `NEXT_PUBLIC_`. Add at least one AI key. `GROQ_API_KEY` and `GEMINI_API_KEY` also stay on the Next.js server. Auto balances configured models and switches on rate limits. Selecting a specific model keeps that choice for the whole draft. Restart the development server after changing `.env`.
3. In Supabase Authentication, keep the Email provider enabled with password sign-in. Set the Site URL and allow the app URL as a redirect URL; for local development, add `http://localhost:3000`. Email confirmation and password reset use this URL. If you previously signed in only with email links, use **Forgot password?** once to set a password.
4. From `H:\devs\lesson_plan_generator`, install dependencies and start the development server:

   ```bash
   npm.cmd --prefix lesson-plan-generator install
   npm.cmd run dev
   ```

5. In the Vercel project dashboard, set `SUPABASE_SECRET_KEY` and `DEVELOPER_SECRET_KEY` for the deployment, enable **Web Analytics**, and deploy the app. Enter the developer key on the **Developer** page to see the last 30 days of AI token usage from Supabase. Visitor and page-view data appears in Vercel's Analytics tab. Historical token usage from before the migration is unavailable.

The Developer page updates automatically every 15 seconds while visible and shows usage for each AI model. Warnings begin at 80% of a known limit. Groq's free-plan reference is 1,000 requests and 200,000 tokens per day for each GPT-OSS model ([Groq rate limits](https://console.groq.com/docs/rate-limits)). The Gemini 3.5 Flash Lite defaults match this project's AI Studio screenshot: **500 requests per day, 15 requests per minute, and 250,000 input tokens per minute**. If project limits change, set `AI_DAILY_LIMITS` to JSON such as `{"gemini-3.5-flash-lite":{"requests":500,"minuteRequests":15,"minuteInputTokens":250000}}`; `tokens` sets an optional daily token limit. You can override either Groq model too. Use `null` to disable a limit. The minute window includes successful AI requests recorded by this app in the last 60 seconds; other API clients using the same key are not counted. Daily totals use UTC, so warnings are an estimate around provider reset times. Groq token totals include cached tokens, making its token warning conservative.

   These commands work in Windows PowerShell. In other shells, use `npm` instead of `npm.cmd`. You can also run both commands inside `lesson-plan-generator` without `--prefix`.

Open [http://localhost:3000](http://localhost:3000). You can create and edit a single draft before signing in. Create an account or sign in with email and password to save plans, classes, course overviews, and settings to Supabase. Browser sessions persist across visits.

Google sign-in is currently hidden. Its implementation remains in `app/page.tsx` for later use. When it is ready for public use, configure a Web application OAuth client in the [Google Auth Platform](https://console.cloud.google.com/auth/clients), add the app origin under **Authorized JavaScript origins**, and add the exact callback URL shown on the Google provider page in Supabase Authentication under **Authorized redirect URIs**. Enter the client ID and secret in the Supabase Google provider settings, configure the Google audience and required scopes, and allow the app URL in Supabase Authentication. Then set `NEXT_PUBLIC_ENABLE_GOOGLE_SIGN_IN=true` in the app environment, update the Privacy Policy and Terms to reflect its availability, and rebuild or restart the app. Keep the Google client secret in Supabase, not in the app's public environment variables.

The public [Privacy Policy](app/privacy/page.tsx) and [Terms and Conditions](app/terms/page.tsx) are available at `/privacy` and `/terms`. The operator name, contact email, and revision date are maintained in [`components/legal-page.tsx`](components/legal-page.tsx). Review the policies when hosting or AI provider settings change.

## How to use Lessonleaf

1. **Sign in or create an account** with an email and password. You can try a single plan before signing in, but saving and term generation require an account.
2. **Set your defaults** in **Settings**: school and teacher details, school year, duration, a school logo, and common lesson fields. Select **Save settings**. Logo upload requires sign-in.
3. **Add a class** in **Classes** with its subject, grade, meeting days, and lesson duration. Skip this if you only need a manual single plan.
4. **Create a course overview** in **Course** for that class. Give every scheduled week a numbered topic.
5. **Create one lesson** under **Generate plans → Single Plan**: enter the lesson details, choose **Smart Template** or **AI draft**, select an AI model when needed, create the draft, edit its sections, then select **Save draft** or **Mark ready**. AI mode requires sign-in.
6. **Create a full term** under **Generate plans → Term Schedule**: choose the class, saved course overview, start date, number of weeks, meeting days, and generation mode. Review the plan count, then generate the drafts. AI mode supports up to 12 meetings per batch; Smart Template supports the full schedule range.
7. **Revisit and print** plans from **My lesson plans**. Saved plans are grouped by course, with plans that have no course under **Other plans**. Open a plan to edit it, or choose a layout and select **Print all** on a course to print its complete set of lessons as one document. For one lesson, open it and use the printer icon in **Lesson preview**. Your browser can save either printout as a PDF.

For each screen and the available options, open **Guide** in the app's navigation or read the [step-by-step user guide](docs/USER_GUIDE.md).

The term generator checks that every requested week has content before saving all drafts to the lesson library. AI content is generated before the Supabase save, so a failed AI request does not create a partial batch. Review AI drafts for accuracy before teaching or printing.

## App structure

- `app/page.tsx`: lesson builder, preview, saved-plan library, and password sign-in UI using shadcn components. Google sign-in code is retained behind a disabled feature flag.
- `components/settings-panel.tsx`: school, lesson, and account settings UI.
- `components/lesson-preview.tsx`: normal and styled printable lesson templates.
- `components/lesson-library.tsx` and `lib/lesson-library.ts`: course-grouped saved plans, search, and full-course printing.
- `components/classes-panel.tsx`, `components/course-panel.tsx`, and `components/term-schedule-panel.tsx`: class and course management and term generation UI.
- `components/ui/`: shadcn buttons, cards, form controls, tabs, badges, and dialog.
- `lib/lesson-plan.ts`: lesson-plan data model, sample topics, validation, and local template drafting.
- `lib/supabase.ts`: browser Supabase client and direct lesson-plan database operations.
- `lib/settings.ts`: settings model, validation, and direct Supabase persistence.
- `lib/school-logo.ts` and `lib/use-school-logo.ts`: logo validation and private Storage downloads for settings and print previews.
- `lib/catalog.ts`: class and course models and direct Supabase CRUD.
- `lib/term-schedule.ts`: meeting-date calculation and editable batch draft creation.
- `app/actions/generate-ai.ts`, `lib/ai-generation.ts`, and `lib/ai-content.ts`: authenticated server-side AI generation, Groq and Gemini response validation, and safe merging into editable drafts.
- `app/developer/page.tsx`, `app/actions/developer-usage.ts`, and `lib/ai-usage-store.ts`: developer-only token usage dashboard and server-side usage recording.

The app has no Next.js API routes. Template drafting runs in the browser; saving and sign-in use Supabase directly. AI requests use a Next.js Server Action so neither provider key is sent to the browser. API usage records contain model names and token counts, not lesson text. Gemini limits depend on the Google AI Studio project and can be checked on its [rate limits page](https://ai.google.dev/gemini-api/docs/rate-limits).

Run `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` to verify the project from the workspace root.
