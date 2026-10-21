import { describe, it } from 'vitest';
import assert from 'node:assert';
import { prisma } from '../src/utils/prisma.js';
import { getAllPlans, seedPlansIfEmpty } from '../src/services/planService.js';

/**
 * Unit function reflecting the exact algorithm in CreditBalanceIndicator.jsx:
 * remainingPercent = (remaining credits / applicable plan credit allowance) * 100
 * Clamped between 0% and 100%.
 */
function calculateCreditRingPercentage(remainingCredits, applicableAllowance) {
  const numCredits = typeof remainingCredits === 'number' && Number.isFinite(remainingCredits)
    ? remainingCredits
    : 0;
  const numAllowance = typeof applicableAllowance === 'number' && Number.isFinite(applicableAllowance)
    ? applicableAllowance
    : 0;

  if (numAllowance <= 0) {
    return {
      percentage: 0,
      isValid: false
    };
  }

  const rawPercent = (numCredits / numAllowance) * 100;
  const clampedPercent = Math.min(100, Math.max(0, rawPercent));

  return {
    percentage: clampedPercent,
    isValid: true
  };
}

describe('Credit Balance Circular Indicator & Dynamic Plan Calculations', () => {
  it('1. Verifies PackagePlans are seeded and dynamic allowances exist in database for FREE, CREATOR, and PROFESSIONAL', async () => {
    await seedPlansIfEmpty();
    const plans = await getAllPlans();

    assert.ok(Array.isArray(plans), 'Plans should be an array');
    const freePlan = plans.find(p => p.planType === 'FREE');
    const creatorPlan = plans.find(p => p.planType === 'CREATOR');
    const proPlan = plans.find(p => p.planType === 'PROFESSIONAL');

    assert.ok(freePlan, 'FREE plan must exist');
    assert.ok(creatorPlan, 'CREATOR plan must exist');
    assert.ok(proPlan, 'PROFESSIONAL plan must exist');

    assert.strictEqual(typeof freePlan.credits, 'number');
    assert.strictEqual(typeof creatorPlan.credits, 'number');
    assert.strictEqual(typeof proPlan.credits, 'number');

    assert.ok(freePlan.credits > 0, 'FREE credits allowance must be > 0');
    assert.ok(creatorPlan.credits > freePlan.credits, 'CREATOR credits allowance must exceed FREE');
    assert.ok(proPlan.credits > creatorPlan.credits, 'PROFESSIONAL credits allowance must exceed CREATOR');
  });

  it('2. Free plan calculation tests (Full ring, partial ring, empty ring)', () => {
    const freeAllowance = 200;

    // 200/200 = 100% full ring
    const full = calculateCreditRingPercentage(200, freeAllowance);
    assert.strictEqual(full.percentage, 100);
    assert.strictEqual(full.isValid, true);

    // 100/200 = 50% ring
    const half = calculateCreditRingPercentage(100, freeAllowance);
    assert.strictEqual(half.percentage, 50);

    // 0/200 = 0% empty ring
    const empty = calculateCreditRingPercentage(0, freeAllowance);
    assert.strictEqual(empty.percentage, 0);
  });

  it('3. Creator plan calculation tests (Full ring, partial consumption)', () => {
    const creatorAllowance = 500;

    // 500/500 = 100% full ring
    const full = calculateCreditRingPercentage(500, creatorAllowance);
    assert.strictEqual(full.percentage, 100);

    // 375/500 = 75% ring
    const threeQuarters = calculateCreditRingPercentage(375, creatorAllowance);
    assert.strictEqual(threeQuarters.percentage, 75);

    // 250/500 = 50% ring
    const half = calculateCreditRingPercentage(250, creatorAllowance);
    assert.strictEqual(half.percentage, 50);

    // 0/500 = 0% empty ring
    const empty = calculateCreditRingPercentage(0, creatorAllowance);
    assert.strictEqual(empty.percentage, 0);
  });

  it('4. Professional plan calculation tests and prompt illustrative examples', () => {
    const proAllowance = 1500;

    // 1500/1500 = 100% full ring
    const full = calculateCreditRingPercentage(1500, proAllowance);
    assert.strictEqual(full.percentage, 100);

    // User prompt example: 750 / 1,500 = 50% ring
    const ex1 = calculateCreditRingPercentage(750, 1500);
    assert.strictEqual(ex1.percentage, 50);

    // User prompt example: 750 / 1,000 = 75% ring
    const ex2 = calculateCreditRingPercentage(750, 1000);
    assert.strictEqual(ex2.percentage, 75);

    // 0 remaining = 0% empty ring
    const empty = calculateCreditRingPercentage(0, proAllowance);
    assert.strictEqual(empty.percentage, 0);
  });

  it('5. Edge case: Zero, missing, or negative allowance safely handled without division by zero', () => {
    // Zero allowance
    const zeroAllowance = calculateCreditRingPercentage(100, 0);
    assert.strictEqual(zeroAllowance.percentage, 0);
    assert.strictEqual(zeroAllowance.isValid, false);

    // Null or undefined allowance
    const nullAllowance = calculateCreditRingPercentage(100, null);
    assert.strictEqual(nullAllowance.percentage, 0);
    assert.strictEqual(nullAllowance.isValid, false);

    // Negative allowance
    const negAllowance = calculateCreditRingPercentage(100, -500);
    assert.strictEqual(negAllowance.percentage, 0);
    assert.strictEqual(negAllowance.isValid, false);
  });

  it('6. Edge case: Credits exceeding allowance (rollover or admin bonus grants) clamped to 100%', () => {
    // 1600 remaining on 1500 plan allowance -> clamped to 100% full ring
    const rollover = calculateCreditRingPercentage(1600, 1500);
    assert.strictEqual(rollover.percentage, 100);

    // 300 remaining on 200 free allowance -> clamped to 100%
    const bonus = calculateCreditRingPercentage(300, 200);
    assert.strictEqual(bonus.percentage, 100);
  });

  it('7. Plan change and upgrade/downgrade scenario simulations', () => {
    // Scenario: User starts on Free (200 allowance) with 200 credits
    let currentAllowance = 200;
    let currentCredits = 200;
    let state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 100);

    // User publishes posts consuming 80 credits -> 120 left
    currentCredits = 120;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 60);

    // User upgrades to Creator Plan (500 allowance allocated)
    currentAllowance = 500;
    currentCredits = 500;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 100);

    // User consumes 125 credits on Creator -> 375 remaining (75%)
    currentCredits = 375;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 75);

    // User upgrades to Professional Plan (1500 allowance)
    currentAllowance = 1500;
    currentCredits = 1500;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 100);

    // Professional user consumes credits down to 750 (50%)
    currentCredits = 750;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 50);

    // Downgrade to Creator Plan (500 allowance)
    currentAllowance = 500;
    currentCredits = 250;
    state = calculateCreditRingPercentage(currentCredits, currentAllowance);
    assert.strictEqual(state.percentage, 50);
  });
});
