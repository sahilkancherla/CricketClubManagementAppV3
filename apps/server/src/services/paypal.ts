// PayPal stub — logs operations instead of calling the PayPal API.
// Replace with the real PayPal SDK / Orders API when ready (P1).

export function createPayout(params: {
  recipientEmail: string;
  amountCents: number;
  note?: string;
}) {
  console.log('[PayPal Stub] Would create payout:', params);
  return { batch_id: 'stub_payout_batch', status: 'PENDING' };
}

export function createOrder(params: {
  amountCents: number;
  payerEmail?: string;
  description?: string;
}) {
  console.log('[PayPal Stub] Would create order:', params);
  return { id: 'stub_order_id', status: 'CREATED', approve_url: null };
}

export function captureOrder(orderId: string) {
  console.log('[PayPal Stub] Would capture order:', orderId);
  return { id: orderId, status: 'COMPLETED' };
}

export function handleWebhookEvent(event: { event_type: string; resource: any }) {
  console.log(`[PayPal Stub] Received webhook event: ${event.event_type}`);

  switch (event.event_type) {
    case 'CHECKOUT.ORDER.APPROVED':
      console.log('[PayPal Stub] Order approved — would capture and mark paid');
      break;
    case 'PAYMENT.CAPTURE.COMPLETED':
      console.log('[PayPal Stub] Capture completed — would mark assignment paid');
      break;
    case 'PAYMENT.CAPTURE.DENIED':
      console.log('[PayPal Stub] Capture denied — would notify user');
      break;
    default:
      console.log(`[PayPal Stub] Unhandled event type: ${event.event_type}`);
  }
}
