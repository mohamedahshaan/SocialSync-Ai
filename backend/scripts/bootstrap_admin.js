/**
 * SocialSync AI — Administrator Provisioning Script
 *
 * Secure bootstrap utility to provision the initial administrator account.
 * Reads credentials from environment variables or secure defaults.
 *
 * Usage:
 *   node scripts/bootstrap_admin.js
 *   ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=StrongAdminSecret! node scripts/bootstrap_admin.js
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../src/utils/prisma.js';

async function bootstrapAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@socialsync.ai').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'SocialSync Super Admin';

  if (!adminPassword || adminPassword.length < 6) {
    console.error('ERROR: Admin password must be at least 6 characters long.');
    process.exit(1);
  }

  console.log(`[BOOTSTRAP] Provisioning administrator: ${adminEmail}`);

  try {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          credits: Math.max(existing.credits, 1000),
          permissions: JSON.stringify(['*']),
          passwordHash
        }
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: updated.id,
          action: 'SUPER_ADMIN_MIGRATED',
          targetUserId: updated.id,
          details: JSON.stringify({ note: 'Administrator promoted to SUPER_ADMIN with full permissions' })
        }
      });

      console.log(`[SUCCESS] Existing user "${adminEmail}" updated to SUPER_ADMIN role with full permissions.`);
    } else {
      const created = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          credits: 1000,
          permissions: JSON.stringify(['*'])
        }
      });

      await prisma.planHistory.create({
        data: {
          userId: created.id,
          plan: 'PROFESSIONAL',
          reason: 'Initial administrator provision'
        }
      });

      await prisma.creditTransaction.create({
        data: {
          userId: created.id,
          amount: 1000,
          balanceAfter: 1000,
          type: 'INITIAL_GRANT',
          reason: 'Initial administrator credit allocation'
        }
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: created.id,
          action: 'ADMIN_BOOTSTRAP_CREATED',
          targetUserId: created.id,
          details: JSON.stringify({ note: 'Initial administrator created via bootstrap script' })
        }
      });

      console.log(`[SUCCESS] New administrator created: ${adminEmail}`);
    }

    console.log('----------------------------------------------------');
    console.log(`Admin Portal: http://localhost:5173/admin/login`);
    console.log(`Admin Email:  ${adminEmail}`);
    console.log(`Credentials:  Saved securely with bcrypt (12 rounds)`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('[ERROR] Failed to provision admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
