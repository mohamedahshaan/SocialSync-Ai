import { Router } from 'express';
import {
  verifyPayHereSignature,
  processVerifiedGatewayPayment,
  processFailedGatewayPayment
} from '../services/paymentGatewayService.js';

const router = Router();

/**
 * POST /api/webhooks/payment
 * Secured webhook handler for payment gateways (PayHere & Generic)
 */
router.post('/payment', async (req, res) => {
  try {
    const payload = req.body;

    // Check for PayHere webhook parameters
    if (payload.merchant_id && payload.order_id) {
      const isValid = verifyPayHereSignature({
        merchantId: payload.merchant_id,
        orderId: payload.order_id,
        amount: payload.payhere_amount,
        currency: payload.payhere_currency,
        statusCode: payload.status_code,
        receivedMd5sig: payload.md5sig
      });

      // If signature secret is configured in production, reject invalid signatures
      if (process.env.PAYHERE_SECRET && !isValid) {
        console.warn('[WEBHOOK_REJECTED] Invalid PayHere webhook signature');
        return res.status(400).send('Invalid signature');
      }

      // Status code 2 is SUCCESS in PayHere
      if (String(payload.status_code) === '2') {
        const result = await processVerifiedGatewayPayment({
          orderId: payload.order_id,
          gatewayTransactionId: payload.payment_id,
          amount: parseFloat(payload.payhere_amount),
          currency: payload.payhere_currency || 'LKR',
          gateway: 'PAYHERE'
        });

        return res.status(200).json({ success: true, processed: !result.alreadyProcessed });
      } else {
        // Payment failed or cancelled
        await processFailedGatewayPayment({
          orderId: payload.order_id,
          failureReason: payload.status_message || 'Payment status not approved',
          gateway: 'PAYHERE'
        });

        return res.status(200).json({ success: false, reason: 'Payment not successful' });
      }
    }

    // Generic / Test Gateway Webhook
    const { orderId, transactionId, amount, currency, status, secret } = payload;
    if (orderId && status === 'SUCCESS') {
      const result = await processVerifiedGatewayPayment({
        orderId,
        gatewayTransactionId: transactionId || `tx_${Date.now()}`,
        amount: parseFloat(amount || 0),
        currency: currency || 'LKR',
        gateway: 'GENERIC'
      });

      return res.status(200).json({ success: true, processed: !result.alreadyProcessed });
    }

    res.status(200).send('Ignored: unhandled webhook payload');
  } catch (error) {
    console.error('[WEBHOOK_ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
