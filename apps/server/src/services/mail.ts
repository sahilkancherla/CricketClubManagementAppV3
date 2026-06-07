// Email stub — logs instead of sending.
// Replace with a real provider (Resend / SendGrid / Mailchimp) when ready.

export function sendWelcomeEmail(params: { email: string; firstName: string; clubName: string }) {
  console.log(`[Mail Stub] Would send welcome email to ${params.email} for club "${params.clubName}"`);
}

export function sendPaymentRequest(params: { email: string; title: string; amount: string; dueDate?: string | null }) {
  console.log(
    `[Mail Stub] Would send payment request to ${params.email}: "${params.title}" for ${params.amount}` +
      (params.dueDate ? ` due ${params.dueDate}` : ''),
  );
}

export function sendGameNotification(params: { email: string; opponent: string; date: string; location?: string | null }) {
  console.log(
    `[Mail Stub] Would notify ${params.email} of game vs ${params.opponent} on ${params.date}` +
      (params.location ? ` at ${params.location}` : ''),
  );
}
