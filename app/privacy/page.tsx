import type { Metadata } from "next";
import { LegalContact, LegalPage, legalOperatorName } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Lessonleaf",
  description: "How Lessonleaf handles account details, lesson content, browser storage, and AI drafting data.",
};

const sections = [
  {
    id: "overview",
    title: "Who we are",
    content: <>
      <p>Lessonleaf is a lesson planning app operated by {legalOperatorName}. This Privacy Policy explains what information the app handles, why it is used, and the choices available to you. The contact for privacy requests is <LegalContact />.</p>
      <p>The app is intended for teachers, instructors and other adults aged 18 or older in a educational environment. It is not a service for students to create accounts.</p>
    </>,
  },
  {
    id: "information",
    title: "Information we handle",
    content: <>
      <ul>
        <li><strong>Account details.</strong> If you register by email, Supabase Auth handles your email address, password authentication, and account identifiers. Lessonleaf does not receive your password in its own server code. If you choose Google sign-in, Google and Supabase Auth process your sign-in; Google may provide your email, name, profile image, and Google account identifier. Lessonleaf uses the resulting Supabase account and session to recognize you.</li>
        <li><strong>Planning content.</strong> You may enter lesson plans, classes, course overviews, school and teacher settings, resource names, dates, and a school logo. Saved content is associated with your account in Supabase. The information in free-text fields depends on what you choose to enter.</li>
        <li><strong>Browser data.</strong> Supabase stores the sign-in session in your browser so you can stay signed in. Lessonleaf also keeps guest settings and an unsaved working draft in browser local storage until you remove them or clear browser data.</li>
        <li><strong>Technical information.</strong> Hosting and service providers may process information such as IP address, browser type, request times, and error or security logs to deliver and protect the service.</li>
      </ul>
      <p>Lessonleaf does not request access to your Google Drive, Gmail, or Calendar through Google sign-in. The app currently has no advertising tracker or analytics SDK.</p>
    </>,
  },
  {
    id: "use",
    title: "How we use information",
    content: <>
      <p>We use account and planning information to authenticate you; save, retrieve, edit, and print your lessons; maintain your settings and school logo; generate drafts when requested; respond to support and privacy requests; and protect the service from misuse. We use Google sign-in data only for account authentication and identification within Lessonleaf.</p>
      <p>We do not sell your lesson content or Google account information, and we do not use it for targeted advertising.</p>
    </>,
  },
  {
    id: "ai",
    title: "AI drafting",
    content: <>
      <p>AI drafting is optional. When you request it, Lessonleaf sends relevant lesson details and course guidance to Groq or the Google Gemini API. Those details can include subject, grade, school year, week, topic, date, duration, chapter, unit, resource, pages, and your focus, activity, or presentation guidance. If you select Auto, either provider may process a request, and the app may switch providers while retrying or handling rate limits. Smart Template drafting does not send lesson content to an AI provider.</p>
      <p>AI providers process prompts and generated responses under their own terms and data controls. Their handling can vary by service plan and configuration. In particular, <a href="https://ai.google.dev/gemini-api/terms">Google’s Gemini API terms</a> distinguish unpaid and paid services; <a href="https://console.groq.com/docs/your-data">Groq explains its inference data practices</a>. Do not enter student personal information, sensitive information, or confidential material in AI fields. Review every generated draft before using it.</p>
    </>,
  },
  {
    id: "sharing",
    title: "Who receives information",
    content: <>
      <p>We use Supabase for account authentication, database storage, and private school-logo storage. We use Google for optional Google sign-in and, when selected or reached through Auto, Gemini AI drafting. We use Groq for AI drafting when selected or reached through Auto. Our hosting provider may process the technical information needed to serve the app. These providers may process data in countries outside the Philippines.</p>
      <p>We may also disclose information if required by law or to address fraud, abuse, or security incidents, subject to applicable law.</p>
    </>,
  },
  {
    id: "storage",
    title: "Storage, security, and retention",
    content: <>
      <p>Saved plans, classes, course overviews, settings, and uploaded logos are stored with Supabase. The app’s database access rules and private logo storage are designed to limit access to the signed-in account. No internet service can guarantee absolute security, so please use a strong password and protect access to your device and Google account.</p>
      <p>Guest settings and unsaved drafts remain in your browser until you clear them through the app or your browser. Account information and saved content are kept while your account remains active or until you remove them or request deletion, subject to necessary backups, security records, and legal obligations. Service providers may keep records under their own retention policies.</p>
    </>,
  },
  {
    id: "choices",
    title: "Your choices and rights",
    content: <>
      <p>You can use Smart Template drafting without an account, edit your saved content, and delete individual plans, classes, course overviews, or uploaded logos in the app. You can also clear browser local storage or sign out. The app does not currently offer a self-service account deletion button.</p>
      <p>To request access, correction, export, or deletion of your personal information, or to object to processing where applicable, contact <LegalContact />. We will handle requests in line with applicable law. If you are in the Philippines, you may also raise a concern with the <a href="https://privacy.gov.ph/">National Privacy Commission</a>.</p>
    </>,
  },
  {
    id: "children",
    title: "Student information and children",
    content: <>
      <p>Lessonleaf is for adult educators, not children. Do not create student accounts or enter student names, contact details, health information, or other sensitive student data into AI prompts. If you add personal information about another person anywhere in the app, you are responsible for having a lawful basis and appropriate authority to do so.</p>
    </>,
  },
  {
    id: "changes",
    title: "Changes and contact",
    content: <>
      <p>We may update this policy when the service or our practices change. We will post the revised version here with a new date and provide additional notice when required by law. For privacy questions or requests, contact <LegalContact />.</p>
    </>,
  },
];

export default function PrivacyPage() {
  return <LegalPage current="privacy" title="Privacy Policy" summary="A clear account of the information Lessonleaf uses to help you plan lessons." sections={sections} />;
}
