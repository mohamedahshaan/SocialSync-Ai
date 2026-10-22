import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

/**
 * Payment Gateway Configuration Checker
 * Checks if real gateway credentials (PayHere or Stripe) are set in environment
 */
export function getGatewayConfig() {
  const payhereMerchantId = process.env.PAYHERE_MERCHANT_ID;
  const payhereSecret = process.env.PAYHERE_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const isPayHereActive = Boolean(payhereMerchantId && payhereSecret);
  const isStripeActive = Boolean(stripeSecretKey && stripeWebhookSecret);

  let activeProvider = 'PENDING';
  if (isPayHereActive) activeProvider = 'PAYHERE';
  else if (isStripeActive) activeProvider = 'STRIPE';

  return {
    isConfigured: isPayHereActive || isStripeActive,
    provider: activeProvider,
    mode: process.env.PAYMENT_GATEWAY_MODE || 'sandbox',
    currency: 'LKR',
    merchantId: payhereMerchantId || null
  };
}

/**
 * Verify PayHere Webhook Signature
 * PayHere MD5 signature format:
 * strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
 */
export function verifyPayHereSignature({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  receivedMd5sig
}) {
  const merchantSecret = process.env.PAYHERE_SECRET;
  if (!merchantSecret) return false;

  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const rawString = `${merchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
  const generatedSignature = crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();

  return (receivedMd5sig || '').toUpperCase() === generatedSignature;
}

/**
 * Verify Generic / HMAC-SHA256 Webhook Signature
 */
export function verifyHmacSignature(payloadString, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Prepare checkout session data
 */
export async function initializeCheckoutSession({
  userId,
  planType,
  billingAmount,
  currency = 'LKR'
}) {
  const gatewayInfo = getGatewayConfig();
  const orderId = `ss_sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const idempotencyKey = `idemp_${orderId}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true }
  });

  if (!user) throw new Error('User not found');

  // Create PENDING payment record with unique idempotencyKey
  const pendingPayment = await prisma.payment.create({
    data: {
      userId,
      amount: billingAmount,
      currency,
      plan: planType.toUpperCase(),
      status: 'PENDING',
      reference: orderId,
      idempotencyKey,
      gateway: gatewayInfo.provider,
      notes: `Initiated checkout for ${planType} subscription (${gatewayInfo.provider})`
    }
  });

  return {
    isConfigured: gatewayInfo.isConfigured,
    provider: gatewayInfo.provider,
    orderId,
    idempotencyKey,
    amount: billingAmount,
    currency,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    paymentId: pendingPayment.id,
    notifyUrl: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/webhooks/payment`
  };
}

/**
 * Process verified payment confirmation from gateway webhook
 * Enforces idempotency, records verified payment, allocates monthly credits, advances billing cycle.
 */
export async function processVerifiedGatewayPayment({
  orderId,
  gatewayTransactionId,
  amount,
  currency = 'LKR',
  gateway = 'PAYHERE'
}) {
  // 1. Find existing payment record
  const payment = await prisma.payment.findUnique({
    where: { reference: orderId }
  });

  if (!payment) {
    throw new Error(`Payment with reference ${orderId} not found`);
  }

  // Idempotency check: if already verified, return early without duplicate processing
  if (payment.status === 'VERIFIED') {
    return {
      alreadyProcessed: true,
      payment
    };
  }

  const now = new Date();
  const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 2. Fetch package plan details for credit allocation
  const packagePlan = await prisma.packagePlan.findUnique({
    where: { planType: payment.plan }
  });

  const creditAllocation = packagePlan
    ? packagePlan.credits
    : (payment.plan === 'CREATOR' ? 250 : payment.plan === 'PROFESSIONAL' ? 1000 : 100);

  // 3. Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // a. Mark payment VERIFIED
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'VERIFIED',
        gateway,
        gatewayTransactionId,
        verifiedAt: now,
        notes: `Verified recurring payment received via ${gateway} webhook.`
      }
    });

    // b. Update user plan and increment credits
    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data: {
        plan: payment.plan,
        credits: { increment: creditAllocation }
      }
    });

    // c. Record auditable credit transaction
    const creditTx = await tx.creditTransaction.create({
      data: {
        userId: payment.userId,
        amount: creditAllocation,
        balanceAfter: updatedUser.credits,
        type: 'SUBSCRIPTION_RENEWAL',
        reason: `Monthly subscription verified payment (${payment.plan}) — Ref: ${orderId}`
      }
    });

    // d. Update or create subscription
    const subscription = await tx.userSubscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan: payment.plan,
        status: 'ACTIVE',
        isFreeTrial: false,
        currentPeriodStart: now,
        currentPeriodEnd: nextCycle,
        nextBillingDate: nextCycle,
        billingAmount: amount,
        currency,
        gateway,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: updatedPayment.id
      },
      update: {
        plan: payment.plan,
        status: 'ACTIVE',
        isFreeTrial: false,
        currentPeriodStart: now,
        currentPeriodEnd: nextCycle,
        nextBillingDate: nextCycle,
        billingAmount: amount,
        gateway,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: updatedPayment.id,
        cancelAtPeriodEnd: false,
        failedAttempts: 0
      }
    });

    // e. Record subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId: payment.userId,
        fromPlan: payment.plan,
        toPlan: payment.plan,
        eventType: 'RENEW',
        effectiveAt: now,
        details: JSON.stringify({
          orderId,
          amount,
          gateway,
          paymentId: updatedPayment.id,
          creditsGranted: creditAllocation
        })
      }
    });

    return { updatedPayment, updatedUser, creditTx, subscription };
  });

  return {
    alreadyProcessed: false,
    ...result
  };
}

/**
 * Handle Failed Payment Webhook from gateway
 */
export async function processFailedGatewayPayment({
  orderId,
  failureReason,
  gateway = 'PAYHERE'
}) {
  const payment = await prisma.payment.findUnique({
    where: { reference: orderId }
  });

  if (!payment) return null;

  const now = new Date();

  // Mark payment FAILED
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      failureReason: failureReason || 'Gateway transaction declined',
      gateway
    }
  });

  // Increment failed attempts and set status to PAST_DUE
  await prisma.userSubscription.updateMany({
    where: { userId: payment.userId },
    data: {
      status: 'PAST_DUE',
      failedAttempts: { increment: 1 }
    }
  });

  return payment;
}
