# Lessonleaf user guide

Lessonleaf creates editable lesson plans from a structured template based on the [sample lesson plan PDF](../public/Lesson%20Plan%20sample.pdf). You can use Smart Template or AI drafting with GPT-OSS 120B; uploading new PDFs is not available. You can make a template plan without an account, but you need an account to use AI, save plans, manage classes and courses, or generate a full term.

If you are running Lessonleaf yourself, complete the [README setup](../README.md#setup) first. Then open the app in your browser. You can return to these steps any time from **Guide** in the app's navigation.

## 1. Create an account or sign in

1. Select **Sign in** at the top of the app.
2. To register, select **Create account**, enter your email and a password of at least eight characters, then select **Create account**. If email confirmation is enabled for your Supabase project, follow the confirmation email before signing in.
3. If you already have an account, enter your email and password and select **Sign in**.
4. If you previously used email links or forgot your password, select **Forgot password?**, enter your email, and follow the reset email. After opening its link, set a new password in **Settings → Account & password**.

You can skip this step to try **Single Plan**. When you select **Save draft** or **Mark ready**, Lessonleaf prompts you to sign in. Classes, course overviews, term schedules, and the saved-plan library require sign-in.

## 2. Set your defaults

1. Open **Settings** from the sidebar, or from the bottom navigation on a small screen.
2. Under **School & teacher**, enter your application title, school name, school year, teacher name, and default lesson duration.
3. Under **Lesson defaults**, enter the subject, grade, section, unit, chapter, and resource or textbook that you use most often.
4. Select **Save settings**.

These values help prefill new plans and printable previews. If you save settings while signed out, they stay in this browser only. After signing in, check the fields and save the values you want in your account. The **Export Drive folder link or ID** field is reserved for a future integration; it does not upload files.

## 3. Add a class for term planning

You can skip this step for a single plan entered manually.

1. Open **Classes** and select **New class** if you are editing an existing one.
2. Enter a class name, subject, grade level, school year, and lesson duration. Section is optional.
3. Select every **Class meeting day**. For example, select Monday and Thursday for two lessons per week.
4. Select **Add class**. To change it later, select it from **Saved classes**, edit the fields, and select **Save changes**.

Deleting a class also deletes its course overviews, so check the class before confirming deletion.

## 4. Add a course overview

A term schedule needs weekly content for every week you plan to generate. You can use a saved course overview for any class, or use the built-in eight-week Science sequence for a Science class.

1. Open **Course** and choose the class at the top.
2. Select **New overview** if an existing overview is open. Enter an **Overview title** and, optionally, a **Course summary**.
3. For each week, enter a unique **Week no.** and a **Topic**. Add the unit, key focus, activity, and presentation goal to give the generated drafts more useful detail.
4. Select **Add week** until the overview covers the weeks you intend to schedule. For a Science curriculum, **Load sample Science sequence** fills in the eight topics from the sample PDF; you can edit them before saving.
5. Select **Create overview**, or **Save overview** when editing an existing one.

The overview belongs to the selected class. A term batch cannot be generated if any requested week is missing from its content source.

## 5. Create one lesson plan

1. Open **Generate plans** and select **Single Plan**.
2. Optionally choose a week from **Explore the sample sequence** to fill in a Grade 1 Science topic. You can also type your own lesson details.
3. Under **Lesson details**, optionally choose a saved **Class** and **Course overview**, then select a **Course week**. A class fills its subject, grade, section, school year, and duration; a course week fills its topic and unit. Choose a **Lesson category** such as Regular or Midterm.
4. Review the subject, grade, school year, week, date, lesson topic, duration, and any optional chapter, resource, pages, or teacher name. Enter a lesson topic if one was not filled automatically.
5. Choose **Generation mode**: **Smart Template** for an immediate structured draft, or **AI draft** for a lesson written around your topic and course guidance. AI drafting requires sign-in and a server-side Groq key. Select **Create lesson draft** or **Create AI lesson draft**. The draft appears in **Lesson preview**.
6. Edit the plan under **Shape the content**. Work through **Goals & resources**, **Teaching flow**, and **Assessment & more**; the preview updates as you edit.
7. Select **Save draft** to keep working later or **Mark ready** when the lesson is ready to teach. These actions save the plan to your account.

Creating a fresh draft replaces the current working draft in the editor. Save any changes you want to keep first. An unsaved working draft is retained in the same browser, but it does not appear in **My lesson plans** until you save it to your account.

## 6. Generate a term schedule

1. Sign in, create a class, and prepare a course overview as described above, unless you will use the built-in Science sequence.
2. Open **Generate plans** and select **Term Schedule**.
3. Choose the **Class**, **Lesson category**, and **Term start date**. The school year, duration, and class meeting days start with the class defaults; adjust them for this batch if needed.
4. Set **Number of weeks** and **Starting week no.**. You can generate 1–24 weeks at a time, within course weeks 1–52.
5. Under **Lesson content source**, choose **Saved course overview** and select an overview for this class. For a Science class, you may choose **Sample Science sequence** instead; it covers weeks 1–8.
6. Optionally enter a default chapter and unit. Review the summary showing the number of plans and the first and last class dates. Each selected meeting day creates one plan per week, starting on or after the term start date.
7. Choose **Generation mode**. **Smart Template** supports the full schedule range. **AI draft** writes content for up to eight class meetings in one batch; reduce the weeks or meeting days if the count is higher. If a missing-week message appears, add those weeks in **Course** or adjust the range. When the schedule looks right, generate the drafts.

The new drafts appear in **My lesson plans**. Each meeting gets its own editable plan with the selected category, date, and weekly topic. In AI mode, all content is generated before saving the batch; if AI generation fails, no drafts from that attempt are saved. Review AI output before teaching.

## 7. Find, edit, and print your plans

1. Open **My lesson plans** to see saved drafts and plans marked **Ready to teach**.
2. Use **Find a lesson plan** to search by topic, class, category, date, or subject, then select **Open** on a plan.
3. Edit its lesson details or content in **Single Plan**. Select **Save draft** or **Mark ready** again to store your changes.
4. In **Lesson preview**, choose a **Print template**. **Normal layout** is the default and follows the sample PDF's title, details table, and bordered sections. **Styled layout** uses the app's original design. The preview shows the selected template.
5. Select the printer icon beside **Lesson preview** to print the selected layout. To save a PDF, choose your browser's **Save as PDF** destination in the print dialog.
6. Select **New lesson plan** to start another plan. To remove a saved plan, select its delete icon in the library and then **Confirm delete**.

The sample PDF is a reference for the built-in format and Science topics; the app does not read new PDFs. If your saved items do not appear, check that you are signed in to the same account and that the Supabase tables in the [README setup](../README.md#setup) have been created. If AI reports that it is not configured, add `GROQ_API_KEY` to the app's `.env` and restart the server.
