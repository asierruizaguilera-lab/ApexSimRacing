export type EmailProvider = 'gmail' | 'resend'

export function mailConfig() {
  return {
    provider: (process.env.EMAIL_PROVIDER || 'gmail') as EmailProvider,
    dryRun: process.env.EMAIL_DRY_RUN !== 'false',
    testTo: process.env.EMAIL_TEST_TO,
    fromName: process.env.EMAIL_FROM_NAME || 'APEX',
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    resendApiKey: process.env.RESEND_API_KEY,
    unsubscribeSecret: process.env.UNSUBSCRIBE_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  }
}
