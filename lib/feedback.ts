export function errorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password. Please try again.";
  if (/email not confirmed/i.test(message)) return "Confirm your email before signing in.";
  if (/user already registered/i.test(message)) return "This email already has an account. Sign in or reset your password.";
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return "Connection lost. Check your internet connection and try again.";
  if (/rate limit|too many requests/i.test(message)) return "Too many attempts. Wait a moment and try again.";
  return message;
}
