export function formatLinkRequiredMessage(email: string): string {
  return `${email} is already registered with a password. Sign in with your password to add Google as a sign-in option.`;
}

export function formatGoogleSignInRequiredMessage(email: string): string {
  return `Use Continue with Google to sign in to ${email}.`;
}
