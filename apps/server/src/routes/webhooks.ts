import { Router } from 'express';
import { handleWebhookEvent } from '../services/paypal';

export const webhookRoutes = Router();

// PayPal webhook endpoint (stub). In production, verify the webhook signature
// against PAYPAL_WEBHOOK_ID before trusting the event. The raw request bytes
// needed for that check are available as `(req as any).rawBody` (captured by the
// express.json `verify` hook in index.ts).
webhookRoutes.post('/webhooks/paypal', (req, res) => {
  const event = req.body || {};
  handleWebhookEvent(event);
  res.json({ received: true });
});
