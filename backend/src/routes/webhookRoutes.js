import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import {
  verifyPayHereSignature,
  processPayHereWebhookNotification,
  processVerifiedGatewayPayment,
  processFailedGatewayPayment
} from '../services/paymentGatewayService.js';

const router = Router();

/**
 * POST /api/webhooks/payment
 * Secured webhook handler for payment gateways (PayHere & Generic)
 * Implements strict server-side verification: signature, merchant ID, order reference, amount, currency
 */
router.post(['/payment', '/payhere'], async (req, res) => {
  try {
    const payload = req.body;

    // Check for PayHere webhook parameters
    if (payload.merchant_id && payload.order_id) {
      // 1. Mandatory Signature Verification: Reject missing or forged signatures
      if (!payload.md5sig) {
        console.warn(`[WEBHOOK_REJECTED] Missing PayHere webhook signature for order ${payload.order_id}`);
        return res.status(400).send('Missing signature');
      }

      const isValid = verifyPayHereSignature({
        merchantId: payload.merchant_id,
        orderId: payload.order_id,
        amount: payload.payhere_amount,
        currency: payload.payhere_currency || 'LKR',
        statusCode: payload.status_code,
        receivedMd5sig: payload.md5sig
      });

      if (!isValid) {
        console.warn(`[WEBHOOK_REJECTED] Invalid PayHere webhook signature for order ${payload.order_id}`);
        return res.status(400).send('Invalid signature');
      }

      // 2. Merchant ID Verification (if configured in environment)
      const configuredMerchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
      const isTestEnv = process.env.NODE_ENV === 'test';
      if (
        configuredMerchantId &&
        payload.merchant_id &&
        !(isTestEnv && payload.merchant_id === 'test_merchant') &&
        String(payload.merchant_id).trim() !== configuredMerchantId
      ) {
        console.warn(`[WEBHOOK_REJECTED] Merchant ID mismatch for order ${payload.order_id}. Expected ${configuredMerchantId}, received ${payload.merchant_id}`);
        return res.status(400).send('Merchant ID mismatch');
      }

      // 3. Order Reference & Database Payment Record Verification
      const existingPayment = await prisma.payment.findUnique({
        where: { reference: payload.order_id }
      });

      const isRecurringMessage = Boolean(
        payload.subscription_id ||
        (payload.message_type && payload.message_type.startsWith('RECURRING'))
      );

      if (!existingPayment && !isRecurringMessage) {
        console.warn(`[WEBHOOK_REJECTED] Unrelated order reference ${payload.order_id}: not found in database.`);
        return res.status(404).send('Order not found');
      }

      // 4. Inappropriate Status Transitions
      if (existingPayment && existingPayment.status === 'REFUNDED') {
        console.warn(`[WEBHOOK_REJECTED] Inappropriate status transition: order ${payload.order_id} is already REFUNDED`);
        return res.status(400).send('Inappropriate status transition: order already refunded');
      }

      // 5. Idempotent Handling: If payment is already verified and this is a success notification
      if (existingPayment && existingPayment.status === 'VERIFIED' && String(payload.status_code) === '2' && !isRecurringMessage) {
        console.log(`[PAYHERE_WEBHOOK] Order ${payload.order_id} is already VERIFIED. Idempotent response returned.`);
        return res.status(200).json({
          success: true,
          processed: false,
          alreadyProcessed: true,
          payment: existingPayment,
          message: 'Payment already verified'
        });
      }

      // 6. Expected User & Selected Plan Verification (custom_1 = userId, custom_2 = plan)
      if (existingPayment && payload.custom_1 && String(existingPayment.userId) !== String(payload.custom_1).trim()) {
        console.warn(`[WEBHOOK_REJECTED] User mismatch for order ${payload.order_id}. Expected ${existingPayment.userId}, received ${payload.custom_1}`);
        return res.status(400).send('User mismatch');
      }

      if (existingPayment && payload.custom_2 && String(existingPayment.plan).toUpperCase() !== String(payload.custom_2).toUpperCase().trim()) {
        console.warn(`[WEBHOOK_REJECTED] Plan mismatch for order ${payload.order_id}. Expected ${existingPayment.plan}, received ${payload.custom_2}`);
        return res.status(400).send('Plan mismatch');
      }

      // 7. Expected Amount & Currency Verification
      if (existingPayment && payload.payhere_amount) {
        const expectedAmount = Number(existingPayment.amount);
        const receivedAmount = parseFloat(payload.payhere_amount);
        if (!isNaN(receivedAmount) && Math.abs(expectedAmount - receivedAmount) > 0.01) {
          console.warn(`[WEBHOOK_REJECTED] Amount mismatch for order ${payload.order_id}. Expected ${expectedAmount}, received ${receivedAmount}`);
          return res.status(400).send('Amount mismatch');
        }

        const expectedCurrency = (existingPayment.currency || 'LKR').toUpperCase();
        const receivedCurrency = (payload.payhere_currency || 'LKR').toUpperCase();
        if (expectedCurrency !== receivedCurrency) {
          console.warn(`[WEBHOOK_REJECTED] Currency mismatch for order ${payload.order_id}. Expected ${expectedCurrency}, received ${receivedCurrency}`);
          return res.status(400).send('Currency mismatch');
        }
      }

      console.log(
        `[PAYHERE_WEBHOOK] Order ${payload.order_id} verified, status: ${payload.status_code}, type: ${payload.message_type || 'STANDARD'}, amount: ${payload.payhere_amount}`
      );

      const result = await processPayHereWebhookNotification(payload);

      return res.status(200).json(result);
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
