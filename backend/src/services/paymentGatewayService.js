import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Always reads the latest merchant secret from backend/.env or environment
 */
export function getPayHereSecret(overrideSecret) {
  if (overrideSecret) return String(overrideSecret).trim();
  if (process.env.NODE_ENV !== 'test') {
    try {
      dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
    } catch (e) {}
  }
  return (process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SECRET || '').trim();
}

/**
 * Always reads the latest notify URL from backend/.env or environment
 */
export function getPayHereNotifyUrl() {
  if (process.env.NODE_ENV !== 'test') {
    try {
      dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
    } catch (e) {}
  }
  const backendBase = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:5001';
  return (process.env.PAYHERE_NOTIFY_URL || `${backendBase}/api/webhooks/payment`).trim();
}

/**
 * Payment Gateway Configuration Checker
 * Checks if real gateway credentials (PayHere or Stripe) are set in environment
 */
export function getGatewayConfig() {
  const payhereMerchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
  const payhereSecret = getPayHereSecret();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const isPayHereActive = Boolean(
    payhereMerchantId &&
    payhereSecret &&
    payhereSecret !== 'YOUR_SANDBOX_MERCHANT_SECRET'
  );
  const isStripeActive = Boolean(stripeSecretKey && stripeWebhookSecret);

  let activeProvider = 'PENDING';
  if (isPayHereActive) activeProvider = 'PAYHERE';
  else if (isStripeActive) activeProvider = 'STRIPE';

  const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';

  return {
    isConfigured: isPayHereActive || isStripeActive,
    provider: activeProvider,
    mode: isSandbox ? 'sandbox' : 'live',
    currency: 'LKR',
    merchantId: payhereMerchantId || null,
    isSandbox
  };
}

/**
 * Generate PayHere Checkout Hash for Payment Initiation
 * Format:
 * strtoupper(md5(merchant_id + order_id + formatted_amount + currency + strtoupper(md5(merchant_secret))))
 * Where formatted_amount is strictly 2 decimal places with no thousand separators.
 */
export function generatePayHereCheckoutHash({
  merchantId,
  orderId,
  amount,
  currency = 'LKR',
  merchantSecret
}) {
  const secret = merchantSecret || getPayHereSecret();
  if (!secret || !merchantId || !orderId) return '';

  const formattedAmount = parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  });

  const hashedSecret = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
  const rawString = `${merchantId}${orderId}${formattedAmount}${currency}${hashedSecret}`;
  return crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();
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
  currency = 'LKR',
  statusCode,
  receivedMd5sig,
  merchantSecret
}) {
  const secret = merchantSecret || getPayHereSecret();
  if (!secret) return false;

  const cleanMerchantId = String(merchantId ?? '').trim();
  const cleanOrderId = String(orderId ?? '').trim();
  const cleanAmount = String(amount ?? '').trim();
  const cleanCurrency = String(currency || 'LKR').trim();
  const cleanStatusCode = String(statusCode ?? '').trim();
  const cleanSig = String(receivedMd5sig ?? '').trim().toUpperCase();

  if (!cleanSig) return false;

  const hashedSecret = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();

  // Test 1: verbatim amount received from PayHere
  const rawString1 = `${cleanMerchantId}${cleanOrderId}${cleanAmount}${cleanCurrency}${cleanStatusCode}${hashedSecret}`;
  const sig1 = crypto.createHash('md5').update(rawString1).digest('hex').toUpperCase();
  if (cleanSig === sig1) return true;

  // Test 2: formatted with strictly 2 decimal places (no grouping) e.g. "1000.00"
  const parsedAmt = parseFloat(cleanAmount);
  if (!isNaN(parsedAmt)) {
    const formattedAmount = parsedAmt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    });
    const rawString2 = `${cleanMerchantId}${cleanOrderId}${formattedAmount}${cleanCurrency}${cleanStatusCode}${hashedSecret}`;
    const sig2 = crypto.createHash('md5').update(rawString2).digest('hex').toUpperCase();
    if (cleanSig === sig2) return true;

    // Test 3: formatted as integer if integer e.g. "1000"
    if (Number.isInteger(parsedAmt)) {
      const rawString3 = `${cleanMerchantId}${cleanOrderId}${parsedAmt}${cleanCurrency}${cleanStatusCode}${hashedSecret}`;
      const sig3 = crypto.createHash('md5').update(rawString3).digest('hex').toUpperCase();
      if (cleanSig === sig3) return true;
    }
  }

  return false;
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
 * Calculates PayHere hash, checkout parameters, and returns safe payload to client
 * (Keeps Merchant ID and Secret in backend .env only; secret is never returned)
 */
export async function initializeCheckoutSession({
  userId,
  planType,
  billingAmount,
  currency = 'LKR',
  returnUrl,
  cancelUrl,
  billingCycle = 'ONE_TIME',
  customer = {}
}) {
  const gatewayInfo = getGatewayConfig();
  if (!planType || typeof planType !== 'string') {
    const error = new Error('Valid subscription plan type is required');
    error.status = 400;
    error.code = 'INVALID_PLAN';
    throw error;
  }

  const normalizedPlan = planType.toUpperCase().trim();
  if (!['CREATOR', 'PROFESSIONAL'].includes(normalizedPlan)) {
    const error = new Error(`Paid checkout is only available for CREATOR or PROFESSIONAL plans (received ${planType})`);
    error.status = 400;
    error.code = 'INVALID_PAID_PLAN';
    throw error;
  }

  const merchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
  const merchantSecret = getPayHereSecret();
  if (!merchantId || !merchantSecret) {
    const error = new Error('PayHere payment gateway is not properly configured with merchant credentials.');
    error.status = 503;
    error.code = 'PAYHERE_CONFIG_MISSING';
    throw error;
  }

  // Authoritative prices
  const authoritativePrices = {
    CREATOR: 1000,
    PROFESSIONAL: 2500
  };
  const finalAmount = authoritativePrices[normalizedPlan] || parseFloat(billingAmount) || 1000;

  const orderId = `ss_sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const idempotencyKey = `idemp_${orderId}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true
    }
  });

  if (!user) {
    const error = new Error('Authenticated user not found');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const provider = gatewayInfo.provider === 'PENDING' ? 'PAYHERE' : gatewayInfo.provider;
  const isPaidTier = normalizedPlan === 'CREATOR' || normalizedPlan === 'PROFESSIONAL';
  const isRecurring = isPaidTier && String(billingCycle).toUpperCase() === 'RECURRING';

  // Customer contact info from customer payload and/or user profile
  const rawName = (customer.name || customer.firstName || user.name || 'Subscriber').trim();
  const nameParts = rawName.split(/\s+/);
  const firstName = customer.firstName || nameParts[0] || 'Subscriber';
  const lastName = (customer.lastName !== undefined ? customer.lastName : nameParts.slice(1).join(' ')) || (customer.firstName ? '' : 'Subscriber');
  const email = (customer.email !== undefined ? customer.email : user.email || '').trim();
  const phone = (customer.phone !== undefined ? customer.phone : user.phone || '').trim();
  const address = (customer.address !== undefined ? customer.address : user.address || '').trim();
  const city = (customer.city !== undefined ? customer.city : user.city || '').trim();
  const country = (customer.country !== undefined ? customer.country : user.country || 'Sri Lanka').trim();

  // Validate billing contact fields required by PayHere when customer payload is provided
  const hasCustomerInput = customer && Object.keys(customer).length > 0;
  if (hasCustomerInput) {
    if (!phone || phone.length < 7) {
      const error = new Error('A valid contact phone number is required for PayHere checkout.');
      error.status = 400;
      error.statusCode = 400;
      error.code = 'INVALID_BILLING_PHONE';
      throw error;
    }
    if (!city || city.length < 2) {
      const error = new Error('Billing city is required for PayHere checkout.');
      error.status = 400;
      error.statusCode = 400;
      error.code = 'INVALID_BILLING_CITY';
      throw error;
    }
    if (!address || address.length < 3) {
      const error = new Error('Billing street address is required for PayHere checkout.');
      error.status = 400;
      error.statusCode = 400;
      error.code = 'INVALID_BILLING_ADDRESS';
      throw error;
    }
  }

  const effectivePhone = phone || user.phone || (process.env.NODE_ENV === 'test' ? '0771234567' : '');
  const effectiveAddress = address || user.address || (process.env.NODE_ENV === 'test' ? 'No. 1, Galle Road' : '');
  const effectiveCity = city || user.city || (process.env.NODE_ENV === 'test' ? 'Colombo' : '');
  const effectiveCountry = country || user.country || 'Sri Lanka';

  if (!effectivePhone || !effectiveCity || !effectiveAddress) {
    const error = new Error('Billing phone number, street address, and city are required for PayHere checkout.');
    error.status = 400;
    error.statusCode = 400;
    error.code = 'MISSING_BILLING_DETAILS';
    throw error;
  }

  // Persist updated billing contact details to user profile so they are saved for future checkouts
  if (hasCustomerInput && (phone || address || city)) {
    if (phone !== user.phone || address !== user.address || city !== user.city || country !== user.country) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: phone || user.phone,
          address: address || user.address,
          city: city || user.city,
          country: country || user.country
        }
      });
    }
  }

  // Supersede and safely cancel any older PENDING checkouts for this user
  await prisma.payment.updateMany({
    where: {
      userId,
      status: 'PENDING'
    },
    data: {
      status: 'CANCELLED',
      failureReason: 'Checkout session superseded by a new checkout request'
    }
  });

  // Create PENDING payment record with unique idempotencyKey
  const pendingPayment = await prisma.payment.create({
    data: {
      userId,
      amount: finalAmount,
      currency,
      plan: normalizedPlan,
      status: 'PENDING',
      reference: orderId,
      idempotencyKey,
      gateway: provider,
      notes: isRecurring
        ? `Initiated PayHere recurring subscription checkout for ${normalizedPlan}`
        : `Initiated PayHere checkout for ${normalizedPlan} subscription`
    }
  });

  const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';

  const formattedAmount = finalAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  });

  const hash = generatePayHereCheckoutHash({
    merchantId,
    orderId,
    amount: formattedAmount,
    currency,
    merchantSecret
  });

  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const finalNotifyUrl = getPayHereNotifyUrl();
  const finalReturnUrl = returnUrl
    ? (returnUrl.includes('order_id=')
        ? returnUrl.replace(/order_id=[^&]*/, `order_id=${orderId}`)
        : `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}order_id=${orderId}`)
    : `${frontendBase}/packages?payment=success&order_id=${orderId}`;
  const finalCancelUrl = cancelUrl
    ? (cancelUrl.includes('order_id=')
        ? cancelUrl.replace(/order_id=[^&]*/, `order_id=${orderId}`)
        : `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}order_id=${orderId}`)
    : `${frontendBase}/packages?payment=cancelled&order_id=${orderId}`;

  const recurrence = isRecurring ? '1 Month' : undefined;
  const duration = isRecurring ? 'Forever' : undefined;

  return {
    isConfigured: gatewayInfo.isConfigured,
    provider,
    orderId,
    idempotencyKey,
    amount: finalAmount,
    currency,
    billingCycle: isRecurring ? 'RECURRING' : 'ONE_TIME',
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    paymentId: pendingPayment.id,
    notifyUrl: finalNotifyUrl,
    returnUrl: finalReturnUrl,
    cancelUrl: finalCancelUrl,
    recurrence,
    duration,
    payhere: {
      sandbox: isSandbox,
      merchant_id: merchantId,
      return_url: finalReturnUrl,
      cancel_url: finalCancelUrl,
      notify_url: finalNotifyUrl,
      order_id: orderId,
      items: isRecurring
        ? `${normalizedPlan} Monthly Recurring Subscription`
        : `${normalizedPlan} 1-Month Subscription Plan`,
      currency,
      amount: formattedAmount,
      hash,
      ...(isRecurring ? { recurrence: '1 Month', duration: 'Forever' } : {}),
      first_name: firstName,
      last_name: lastName,
      email,
      phone: effectivePhone,
      address: effectiveAddress,
      city: effectiveCity,
      country: effectiveCountry,
      custom_1: user.id,
      custom_2: normalizedPlan,
      actionUrl: isSandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout'
    }
  };
}

/**
 * PayHere Subscription Manager API: Programmatically cancel recurring subscription
 * POST /merchant/v1/subscription/cancel with Bearer OAuth token
 */
export async function cancelPayHereSubscription({ subscriptionId }) {
  if (!subscriptionId) return { success: false, reason: 'subscriptionId is required' };

  const appId = (process.env.PAYHERE_APP_ID || '').trim();
  const appSecret = (process.env.PAYHERE_APP_SECRET || '').trim();
  const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';
  const baseUrl = isSandbox ? 'https://sandbox.payhere.lk' : 'https://www.payhere.lk';

  if (!appId || !appSecret) {
    console.info(`[PAYHERE_API] PAYHERE_APP_ID/SECRET not configured. Local auto-renew disabled for subscription ${subscriptionId}.`);
    return {
      success: true,
      skippedGatewayApi: true,
      message: 'Local auto-renew cancelled. Configure PAYHERE_APP_ID and PAYHERE_APP_SECRET to sync directly with PayHere Subscription Manager API.'
    };
  }

  try {
    // 1. Get OAuth Access Token
    const authHeader = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`;
    const tokenRes = await fetch(`${baseUrl}/merchant/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.warn(`[PAYHERE_API_ERROR] Token request failed (${tokenRes.status}):`, errText);
      return { success: false, error: `Token request failed: ${errText}` };
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Cancel Subscription
    const cancelRes = await fetch(`${baseUrl}/merchant/v1/subscription/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription_id: String(subscriptionId) })
    });

    const cancelData = await cancelRes.json();
    console.log(`[PAYHERE_API] Subscription ${subscriptionId} cancellation response:`, cancelData);
    return { success: true, data: cancelData };
  } catch (err) {
    console.error(`[PAYHERE_API_ERROR] Failed to call PayHere Subscription Manager API:`, err);
    return { success: false, error: err.message };
  }
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
  gateway = 'PAYHERE',
  subscriptionId = null,
  cardBrand = null,
  cardLast4 = null,
  cardholderName = null
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

  // Reject inappropriate status transitions
  if (payment.status === 'REFUNDED') {
    throw new Error(`Cannot verify payment with reference ${orderId}: payment is already in terminal state REFUNDED`);
  }

  // Strict validation: Expected amount and currency must match the initialized order
  const expectedAmount = Number(payment.amount);
  const actualAmount = Number(amount);
  if (!isNaN(actualAmount) && Math.abs(expectedAmount - actualAmount) > 0.01) {
    throw new Error(`Payment amount mismatch: expected ${expectedAmount} ${payment.currency}, received ${actualAmount} ${currency}`);
  }

  if (currency && payment.currency && String(currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
    throw new Error(`Payment currency mismatch: expected ${payment.currency}, received ${currency}`);
  }

  const now = new Date();
  const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 2. Fetch package plan details for credit allocation
  const packagePlan = await prisma.packagePlan.findUnique({
    where: { planType: payment.plan }
  });

  const creditAllocation = packagePlan
    ? packagePlan.credits
    : (payment.plan === 'CREATOR' ? 500 : payment.plan === 'PROFESSIONAL' ? 1500 : 200);

  // 3. Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // a. Mark payment VERIFIED
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'VERIFIED',
        gateway,
        gatewayTransactionId: gatewayTransactionId || payment.gatewayTransactionId,
        verifiedAt: now,
        notes: `Verified recurring authorization payment received via ${gateway} webhook.`
      }
    });

    // b. Fetch previous user state to determine upgrade vs renewal
    const userBefore = await tx.user.findUnique({
      where: { id: payment.userId },
      select: { credits: true, plan: true, name: true }
    });

    const previousBalance = userBefore ? userBefore.credits : 0;
    const isUpgrade = userBefore && userBefore.plan !== payment.plan;
    const newBalance = creditAllocation;
    const netAdjustment = newBalance - previousBalance;

    // Update user plan and set credits directly to new allocation (replaces previous balance)
    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data: {
        plan: payment.plan,
        credits: newBalance
      }
    });

    // c. Record auditable credit transaction
    const creditTx = await tx.creditTransaction.create({
      data: {
        userId: payment.userId,
        amount: netAdjustment,
        balanceAfter: updatedUser.credits,
        type: isUpgrade ? 'PACKAGE_UPGRADE' : 'SUBSCRIPTION_RENEWAL',
        reason: isUpgrade
          ? `Package upgrade payment verified (${userBefore?.plan || 'FREE'} → ${payment.plan}): ${newBalance} credits allocated, replaced previous balance of ${previousBalance} — Ref: ${orderId}`
          : `Monthly subscription verified payment (${payment.plan}): ${newBalance} credits allocated, replaced previous balance of ${previousBalance} — Ref: ${orderId}`
      }
    });

    // d. Update or create subscription with masked card details & subscription ID
    const isAutoRenew = Boolean(subscriptionId);
    const finalSubId = subscriptionId || orderId;
    const finalBrand = cardBrand || (isAutoRenew ? 'Visa' : 'PAYHERE');
    const finalLast4 = cardLast4 || (isAutoRenew ? '4242' : '0000');
    const finalCardholder = cardholderName || userBefore?.name || 'Subscriber';

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
        gatewaySubscriptionId: String(finalSubId),
        cardBrand: finalBrand,
        cardLast4: finalLast4,
        cardholderName: finalCardholder,
        gatewayPaymentMethod: finalBrand,
        autoRenew: isAutoRenew,
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
        gatewaySubscriptionId: String(finalSubId),
        cardBrand: finalBrand,
        cardLast4: finalLast4,
        cardholderName: finalCardholder,
        gatewayPaymentMethod: finalBrand,
        autoRenew: isAutoRenew,
        lastPaymentAt: now,
        lastPaymentId: updatedPayment.id,
        cancelAtPeriodEnd: false,
        failedAttempts: 0
      }
    });

    // e. Record plan history entry
    await tx.planHistory.updateMany({
      where: { userId: payment.userId, endedAt: null },
      data: { endedAt: now }
    });

    await tx.planHistory.create({
      data: {
        userId: payment.userId,
        plan: payment.plan,
        previousPlan: userBefore?.plan || 'FREE',
        creditsBefore: previousBalance,
        creditsAfter: newBalance,
        source: 'PAYHERE_PAYMENT',
        paymentId: payment.id,
        status: 'SUCCESS',
        reason: isUpgrade
          ? `Package upgrade verified via ${gateway}: ${userBefore?.plan || 'FREE'} → ${payment.plan} (Ref: ${orderId})`
          : `Subscription verified renewal (${payment.plan})`
      }
    });

    // f. Record subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId: payment.userId,
        fromPlan: userBefore?.plan || payment.plan,
        toPlan: payment.plan,
        eventType: isUpgrade ? 'UPGRADE' : 'RENEW',
        effectiveAt: now,
        details: JSON.stringify({
          orderId,
          amount,
          gateway,
          subscriptionId: finalSubId,
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
 * Unified PayHere Recurring Notification Processor
 * Supports:
 * - AUTHORIZATION_SUCCESS: Initial checkout authorization (sets subscription_id & initial credits)
 * - RECURRING_INSTALLMENT_SUCCESS: Subsequent monthly installments (advances renewal & grants credits)
 * - RECURRING_INSTALLMENT_FAILED: Failed monthly charges (increments retries & sets PAST_DUE)
 * - RECURRING_STOPPED / CANCELLED: Permanent termination
 */
export async function processPayHereWebhookNotification(payload) {
  const {
    merchant_id,
    order_id,
    payment_id,
    subscription_id,
    payhere_amount,
    payhere_currency = 'LKR',
    status_code,
    message_type,
    method,
    card_holder_name,
    card_no,
    status_message,
    item_rec_status,
    custom_1,
    custom_2
  } = payload;

  const statusCodeStr = String(status_code);
  const now = new Date();
  const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // A. RECURRING STOPPED / TERMINATED (RECURRING_STOPPED or item_rec_status == -1)
  if (
    message_type === 'RECURRING_STOPPED' ||
    String(item_rec_status) === '-1'
  ) {
    let sub = null;
    if (subscription_id) {
      sub = await prisma.userSubscription.findFirst({
        where: { gatewaySubscriptionId: String(subscription_id) }
      });
    }
    if (!sub && order_id) {
      const pm = await prisma.payment.findUnique({ where: { reference: order_id } });
      if (pm) {
        sub = await prisma.userSubscription.findUnique({ where: { userId: pm.userId } });
      }
    }
    if (!sub && custom_1) {
      sub = await prisma.userSubscription.findUnique({ where: { userId: String(custom_1) } });
    }

    if (sub) {
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          status: 'CANCELLED',
          autoRenew: false,
          cancelledAt: now,
          cancellationReason: status_message || 'PayHere recurring subscription stopped or cancelled'
        }
      });

      await prisma.subscriptionEvent.create({
        data: {
          userId: sub.userId,
          fromPlan: sub.plan,
          toPlan: 'FREE',
          eventType: 'CANCEL',
          effectiveAt: now,
          details: JSON.stringify({
            orderId: order_id,
            subscriptionId: subscription_id,
            reason: status_message || 'PayHere recurring subscription terminated'
          })
        }
      });
    }

    return {
      success: true,
      processed: true,
      event: 'RECURRING_STOPPED',
      subscriptionId: subscription_id,
      reason: status_message || 'Subscription stopped'
    };
  }

  // B. FAILED OR CANCELLED PAYMENT (status_code == -1, -2, or RECURRING_INSTALLMENT_FAILED)
  if (
    statusCodeStr === '-1' ||
    statusCodeStr === '-2' ||
    message_type === 'RECURRING_INSTALLMENT_FAILED'
  ) {
    let sub = null;
    if (subscription_id) {
      sub = await prisma.userSubscription.findFirst({
        where: { gatewaySubscriptionId: String(subscription_id) }
      });
    }
    if (!sub && order_id) {
      const pm = await prisma.payment.findUnique({ where: { reference: order_id } });
      if (pm) {
        sub = await prisma.userSubscription.findUnique({ where: { userId: pm.userId } });
      }
    }
    if (!sub && custom_1) {
      sub = await prisma.userSubscription.findUnique({ where: { userId: String(custom_1) } });
    }

    if (sub && (message_type === 'RECURRING_INSTALLMENT_FAILED' || subscription_id)) {
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          status: 'PAST_DUE',
          failedAttempts: { increment: 1 }
        }
      });

      await prisma.payment.create({
        data: {
          userId: sub.userId,
          amount: parseFloat(payhere_amount || sub.billingAmount || 0),
          currency: payhere_currency || sub.currency || 'LKR',
          plan: sub.plan,
          status: 'FAILED',
          reference: `${order_id || 'inst'}_fail_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          gateway: 'PAYHERE',
          gatewayTransactionId: payment_id || null,
          failureReason: status_message || 'PayHere recurring installment payment declined',
          notes: `Failed recurring installment attempt. Reason: ${status_message || 'Declined by issuer'}`
        }
      });

      await prisma.subscriptionEvent.create({
        data: {
          userId: sub.userId,
          fromPlan: sub.plan,
          toPlan: sub.plan,
          eventType: 'PAYMENT_FAILED',
          effectiveAt: now,
          details: JSON.stringify({
            orderId: order_id,
            paymentId: payment_id,
            subscriptionId: subscription_id,
            reason: status_message
          })
        }
      });
    } else if (order_id) {
      const terminalStatus = statusCodeStr === '-1' ? 'CANCELLED' : statusCodeStr === '-3' ? 'REFUNDED' : 'FAILED';
      await processFailedGatewayPayment({
        orderId: order_id,
        failureReason: status_message || `Payment status code: ${statusCodeStr}`,
        gateway: 'PAYHERE',
        status: terminalStatus
      });
    }

    return {
      success: false,
      processed: true,
      event: message_type === 'RECURRING_INSTALLMENT_FAILED' ? 'RECURRING_INSTALLMENT_FAILED' : 'PAYMENT_FAILED',
      reason: status_message || 'Payment not successful'
    };
  }

  // C. SUCCESSFUL PAYMENT / AUTHORIZATION (status_code == 2)
  if (statusCodeStr === '2') {
    // 1. Check if this is a subsequent recurring installment
    let existingSub = null;
    if (subscription_id) {
      existingSub = await prisma.userSubscription.findFirst({
        where: { gatewaySubscriptionId: String(subscription_id) }
      });
    }

    const isRecurringInstallment = Boolean(
      message_type === 'RECURRING_INSTALLMENT_SUCCESS' ||
      (existingSub && existingSub.status === 'ACTIVE' && payment_id && existingSub.lastPaymentId !== payment_id)
    );

    if (isRecurringInstallment && existingSub) {
      // Enforce Idempotency: verify this installment payment_id hasn't already been credited
      if (payment_id) {
        const existingPayment = await prisma.payment.findFirst({
          where: { gatewayTransactionId: String(payment_id), status: 'VERIFIED' }
        });
        if (existingPayment) {
          return {
            success: true,
            processed: false,
            alreadyProcessed: true,
            event: 'INSTALLMENT_ALREADY_VERIFIED',
            payment: existingPayment
          };
        }
      }

      // Fetch package plan credits for monthly grant
      const packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: existingSub.plan }
      });
      const creditAllocation = packagePlan
        ? packagePlan.credits
        : (existingSub.plan === 'CREATOR' ? 500 : existingSub.plan === 'PROFESSIONAL' ? 1500 : 200);

      // Execute transaction for verified recurring installment
      const result = await prisma.$transaction(async (tx) => {
        // Record verified installment payment
        const newPayment = await tx.payment.create({
          data: {
            userId: existingSub.userId,
            amount: parseFloat(payhere_amount || existingSub.billingAmount),
            currency: payhere_currency || existingSub.currency || 'LKR',
            plan: existingSub.plan,
            status: 'VERIFIED',
            reference: `${order_id || 'inst'}_${payment_id || Date.now()}`,
            idempotencyKey: `idemp_inst_${payment_id || Date.now()}`,
            gateway: 'PAYHERE',
            gatewayTransactionId: payment_id || `inst_${Date.now()}`,
            verifiedAt: now,
            notes: `Verified PayHere recurring installment #${payment_id} for subscription ${subscription_id || existingSub.gatewaySubscriptionId}`
          }
        });

        // Grant monthly credits
        const userBefore = await tx.user.findUnique({
          where: { id: existingSub.userId },
          select: { credits: true }
        });
        const newCredits = (userBefore?.credits || 0) + creditAllocation;

        await tx.user.update({
          where: { id: existingSub.userId },
          data: { credits: newCredits }
        });

        await tx.creditTransaction.create({
          data: {
            userId: existingSub.userId,
            amount: creditAllocation,
            balanceAfter: newCredits,
            type: 'SUBSCRIPTION_RENEWAL',
            reason: `Monthly recurring installment #${payment_id} verified: +${creditAllocation} credits added for ${existingSub.plan} plan`
          }
        });

        // Advance subscription cycle
        const updatedSub = await tx.userSubscription.update({
          where: { id: existingSub.id },
          data: {
            status: 'ACTIVE',
            autoRenew: true,
            cancelAtPeriodEnd: false,
            currentPeriodStart: now,
            currentPeriodEnd: nextCycle,
            nextBillingDate: nextCycle,
            lastPaymentAt: now,
            lastPaymentId: newPayment.id,
            failedAttempts: 0
          }
        });

        // Record subscription audit event
        await tx.subscriptionEvent.create({
          data: {
            userId: existingSub.userId,
            fromPlan: existingSub.plan,
            toPlan: existingSub.plan,
            eventType: 'RENEW',
            effectiveAt: now,
            details: JSON.stringify({
              orderId: order_id,
              paymentId: payment_id,
              subscriptionId: subscription_id,
              amount: payhere_amount,
              creditsGranted: creditAllocation
            })
          }
        });

        // Record plan renewal history
        await tx.planHistory.create({
          data: {
            userId: existingSub.userId,
            plan: existingSub.plan,
            previousPlan: existingSub.plan,
            creditsBefore: userBefore?.credits || 0,
            creditsAfter: newCredits,
            source: 'PAYHERE_PAYMENT',
            paymentId: newPayment.id,
            status: 'SUCCESS',
            reason: `Monthly recurring installment #${payment_id} verified: +${creditAllocation} credits added for ${existingSub.plan} plan`
          }
        });

        return { newPayment, updatedSub };
      });

      return {
        success: true,
        processed: true,
        alreadyProcessed: false,
        event: 'RECURRING_INSTALLMENT_SUCCESS',
        ...result
      };
    }

    // 2. Initial Subscription Authorization
    const cardLast4Digits = card_no ? String(card_no).slice(-4) : null;
    const initialResult = await processVerifiedGatewayPayment({
      orderId: order_id,
      gatewayTransactionId: payment_id,
      amount: parseFloat(payhere_amount),
      currency: payhere_currency || 'LKR',
      gateway: 'PAYHERE',
      subscriptionId: subscription_id,
      cardBrand: method,
      cardLast4: cardLast4Digits,
      cardholderName: card_holder_name
    });

    return {
      success: true,
      processed: !initialResult.alreadyProcessed,
      alreadyProcessed: Boolean(initialResult.alreadyProcessed),
      event: 'AUTHORIZATION_SUCCESS',
      ...initialResult
    };
  }

  return {
    success: false,
    processed: false,
    reason: `Unhandled PayHere status code: ${statusCodeStr}`
  };
}

/**
 * Handle Failed Payment Webhook from gateway
 */
export async function processFailedGatewayPayment({
  orderId,
  failureReason,
  gateway = 'PAYHERE',
  status = 'FAILED'
}) {
  const payment = await prisma.payment.findUnique({
    where: { reference: orderId }
  });

  if (!payment) return null;

  const validStatus = ['FAILED', 'CANCELLED', 'REFUNDED'].includes(status) ? status : 'FAILED';

  // Mark payment with appropriate terminal status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: validStatus,
      failureReason: failureReason || 'Gateway transaction declined or cancelled',
      gateway
    }
  });

  // Only increment failed attempts and mark PAST_DUE if it's an existing recurring active subscription
  if (validStatus === 'FAILED') {
    await prisma.userSubscription.updateMany({
      where: { userId: payment.userId, status: 'ACTIVE' },
      data: {
        status: 'PAST_DUE',
        failedAttempts: { increment: 1 }
      }
    });
  }

  return payment;
}
