import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact, LegalPage, legalOperatorName } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms and Conditions | Lessonleaf",
  description: "Terms for using Lessonleaf's lesson planning, storage, and AI drafting features.",
};

const sections = [
  {
    id: "agreement",
    title: "Agreement and eligibility",
    content: <>
      <p>These Terms and Conditions govern your use of Lessonleaf, operated by {legalOperatorName}. By using the app, you agree to these Terms. Our <Link href="/privacy">Privacy Policy</Link> explains how personal information is handled. If you do not agree to these Terms, do not use the app.</p>
      <p>You must be at least 18 years old and able to enter into this agreement. Lessonleaf is intended for teachers and other adult educators, not for student accounts.</p>
    </>,
  },
  {
    id: "service",
    title: "The service and your account",
    content: <>
      <p>Lessonleaf helps you create, edit, save, and print lesson plans. Some features require an account; a single Smart Template draft can be tried without signing in. You may sign in with email and password or, if enabled, Google. You are responsible for accurate account information, keeping your credentials secure, and activity under your account. Tell us promptly at <LegalContact /> if you believe your account has been used without permission.</p>
      <p>We may change, pause, or discontinue features to maintain or improve the service. We will try to give reasonable notice of material changes when practical.</p>
    </>,
  },
  {
    id: "content",
    title: "Your content",
    content: <>
      <p>You keep the rights you have in the lesson details, documents, logos, and other content you submit. You give Lessonleaf permission to host, process, display, and transmit that content as needed to provide the features you request, including sending relevant lesson details to an AI provider when you choose AI drafting. This permission lasts while we need to provide the service and handle lawful retention obligations.</p>
      <p>You are responsible for having the rights and permissions needed to upload or enter content. Do not submit another person’s personal information unless you are authorized and have a lawful basis. Avoid putting student personal information, confidential records, or sensitive information in AI drafting fields.</p>
    </>,
  },
  {
    id: "ai",
    title: "AI drafts and teaching decisions",
    content: <>
      <p>AI drafts are optional suggestions, not verified teaching materials. They may be inaccurate, incomplete, unsuitable for a class, or similar to content generated for another user. You must review facts, citations, age suitability, curriculum alignment, and classroom safety before using or sharing a plan. You remain responsible for teaching decisions and compliance with your school’s rules.</p>
      <p>AI generation depends on third-party services and may be unavailable, delayed, or rate limited. The <Link href="/privacy#ai">Privacy Policy</Link> explains what lesson details are sent to Groq or Google Gemini when AI drafting is requested.</p>
    </>,
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: <>
      <p>You agree not to use Lessonleaf to violate the law or another person’s rights, upload malicious code, interfere with the app or other users, attempt unauthorized access, or bypass usage limits and security measures. You must not use the app to make decisions about students without appropriate human review.</p>
    </>,
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: <>
      <p>Lessonleaf relies on Supabase for authentication and storage, Google for optional sign-in, and Groq or Google Gemini for AI drafting. Your use of those features may also be subject to the providers’ applicable terms. We do not control their availability or policies. Links to external sites are provided for convenience and do not make their content part of Lessonleaf.</p>
    </>,
  },
  {
    id: "ending-use",
    title: "Ending use and account access",
    content: <>
      <p>You may stop using the app at any time. You can delete individual saved items in the app and request full account deletion at <LegalContact />. We may restrict or end access if you materially breach these Terms, threaten the service or other users, or if required by law. Where practical, we will give notice and an opportunity to resolve the issue.</p>
      <p>Before leaving, save or print any lesson plans you need. Data retention after account closure is described in the <Link href="/privacy#storage">Privacy Policy</Link>.</p>
    </>,
  },
  {
    id: "disclaimers",
    title: "Availability and responsibility",
    content: <>
      <p>We aim to keep Lessonleaf useful and secure, but do not promise uninterrupted access or error-free output. To the extent allowed by law, the service is provided as available, without warranties beyond those that cannot lawfully be excluded. Nothing in these Terms limits rights or remedies that applicable law does not allow us to limit.</p>
      <p>To the extent permitted by applicable law, {legalOperatorName} is not responsible for indirect or consequential losses arising from use of the service. This does not exclude liability that cannot legally be excluded.</p>
    </>,
  },
  {
    id: "law-changes",
    title: "Governing law and changes",
    content: <>
      <p>The laws of the Republic of the Philippines govern these Terms, subject to any mandatory protections that apply to you. Disputes will be handled by courts with jurisdiction under applicable law.</p>
      <p>We may update these Terms as the service changes. We will post the updated text and date here, and provide additional notice for material changes when required. Continued use after revised Terms take effect means you accept them.</p>
    </>,
  },
  {
    id: "contact",
    title: "Contact",
    content: <p>Questions about these Terms can be sent to <LegalContact />.</p>,
  },
];

export default function TermsPage() {
  return <LegalPage current="terms" title="Terms and Conditions" summary="The rules for using Lessonleaf and the responsibilities that come with creating and sharing lesson plans." sections={sections} />;
}
