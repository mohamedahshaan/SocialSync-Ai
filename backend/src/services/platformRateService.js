import { prisma } from '../utils/prisma.js';

export const DEFAULT_PLATFORM_RATES = {
  FACEBOOK: 5,
  INSTAGRAM: 8,
  LINKEDIN: 5,
  YOUTUBE: 15,
  TIKTOK: 12,
  THREADS: 5,
  X: 5
};

export const RECOMMENDED_PLATFORM_DEFAULTS = {
  FACEBOOK: 15,
  INSTAGRAM: 12,
  LINKEDIN: 12,
  TIKTOK: 10,
  YOUTUBE: 10,
  THREADS: 8,
  X: 5
};

class PlatformRateService {
  /**
   * Seed default platform rates if they do not exist in the database
   */
  async seedPlatformRatesIfEmpty() {
    try {
      for (const [platform, defaultCost] of Object.entries(DEFAULT_PLATFORM_RATES)) {
        await prisma.platformCreditConfig.upsert({
          where: { platform },
          update: {}, // keep existing configured value if already present
          create: {
            platform,
            costCredits: defaultCost
          }
        });
      }
    } catch (err) {
      console.error('[PLATFORM_RATES] Error seeding platform rates:', err.message);
    }
  }

  /**
   * Fetch all platform rate configurations from PostgreSQL
   */
  async getAllPlatformRates() {
    await this.seedPlatformRatesIfEmpty();
    return prisma.platformCreditConfig.findMany({
      orderBy: { platform: 'asc' },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  /**
   * Return a dictionary of platform rates: { FACEBOOK: 5, INSTAGRAM: 8, ... }
   */
  async getPlatformRateMap() {
    const rates = await this.getAllPlatformRates();
    const map = { ...DEFAULT_PLATFORM_RATES };
    for (const r of rates) {
      map[r.platform] = r.costCredits;
    }
    return map;
  }

  /**
   * Get single platform cost in credits
   * @param {string} platformName
   * @returns {Promise<number>}
   */
  async getPlatformCost(platformName) {
    if (!platformName) return 5;
    const norm = String(platformName).toUpperCase();
    try {
      const config = await prisma.platformCreditConfig.findUnique({
        where: { platform: norm }
      });
      if (config) return config.costCredits;
    } catch (err) {
      console.warn(`[PLATFORM_RATES] Could not fetch DB rate for ${norm}, falling back to default:`, err.message);
    }
    return DEFAULT_PLATFORM_RATES[norm] ?? 5;
  }

  /**
   * Calculate total credits required across selected platform list
   * @param {Array<{ platform: string } | string>} platforms
   */
  async calculateTotalCost(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return { totalCredits: 0, platformCosts: [] };
    }
    const rateMap = await this.getPlatformRateMap();
    let totalCredits = 0;
    const platformCosts = [];

    for (const p of platforms) {
      const name = (typeof p === 'string' ? p : p.platform).toUpperCase();
      const cost = rateMap[name] !== undefined ? rateMap[name] : (DEFAULT_PLATFORM_RATES[name] ?? 5);
      totalCredits += cost;
      platformCosts.push({ platform: name, costCredits: cost });
    }

    return { totalCredits, platformCosts };
  }

  /**
   * Update credit rate for a specific platform with comprehensive audit logging
   * @param {Object} params
   */
  async updatePlatformRate(arg1, arg2, arg3, arg4) {
    let platform, newCost, adminId, adminEmail, reason;
    if (typeof arg1 === 'object' && arg1 !== null) {
      ({ platform, newCost, adminId, adminEmail, reason = null } = arg1);
    } else {
      platform = arg1;
      newCost = arg2;
      adminId = arg3;
      reason = arg4 || null;
    }
    const normPlatform = String(platform).toUpperCase();
    if (!DEFAULT_PLATFORM_RATES.hasOwnProperty(normPlatform)) {
      throw new Error(`Unsupported platform: ${platform}. Supported: ${Object.keys(DEFAULT_PLATFORM_RATES).join(', ')}`);
    }

    const parsedCost = parseInt(newCost, 10);
    if (isNaN(parsedCost) || parsedCost < 0) {
      throw new Error('Platform credit cost must be a non-negative integer.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch current cost for audit comparison
      const existing = await tx.platformCreditConfig.findUnique({
        where: { platform: normPlatform }
      });
      const previousCost = existing ? existing.costCredits : (DEFAULT_PLATFORM_RATES[normPlatform] || 5);

      // 2. Upsert new configuration
      const updatedConfig = await tx.platformCreditConfig.upsert({
        where: { platform: normPlatform },
        create: {
          platform: normPlatform,
          costCredits: parsedCost,
          updatedById: adminId || null
        },
        update: {
          costCredits: parsedCost,
          updatedById: adminId || null
        }
      });

      // 3. Create dedicated audit log record
      const auditLog = await tx.platformRateAuditLog.create({
        data: {
          configId: updatedConfig.id,
          platform: normPlatform,
          previousCost,
          newCost: parsedCost,
          adminId: adminId || null,
          adminEmail: adminEmail || null,
          reason: reason || `Admin updated ${normPlatform} cost from ${previousCost} to ${parsedCost} credits`
        }
      });

      // 4. Also record in main AdminAuditLog if admin is provided
      if (adminId) {
        await tx.adminAuditLog.create({
          data: {
            adminId,
            action: 'UPDATE_PLATFORM_RATE',
            details: JSON.stringify({
              configId: updatedConfig.id,
              platform: normPlatform,
              previousCost,
              newCost: parsedCost,
              reason: reason || 'Platform rate adjustment'
            })
          }
        });
      }

      console.log(`[PLATFORM_RATES] Rate updated: ${normPlatform} changed ${previousCost} -> ${parsedCost} credits by ${adminEmail || 'admin'}`);

      return {
        config: updatedConfig,
        auditLog
      };
    });
  }

  /**
   * Bulk update multiple platform rates in a transaction
   * @param {Object} params
   */
  async updatePlatformRatesBulk({ rates, adminId, adminEmail, reason = null }) {
    if (!Array.isArray(rates) || rates.length === 0) {
      throw new Error('A valid array of platform rates is required for bulk update.');
    }
    const results = [];
    for (const item of rates) {
      const res = await this.updatePlatformRate({
        platform: item.platform,
        newCost: item.costCredits ?? item.newCost ?? item.cost,
        adminId,
        adminEmail,
        reason: reason || 'Bulk platform rate update'
      });
      results.push(res);
    }
    return results;
  }

  /**
   * Get audit log history of platform rate adjustments
   */
  async getRateAuditLogs(params = {}) {
    let platform = null;
    let limit = 50;
    let offset = 0;
    if (typeof params === 'string') {
      platform = params;
    } else if (params && typeof params === 'object') {
      platform = params.platform || null;
      limit = params.limit || 50;
      offset = params.offset || 0;
    }

    const where = {};
    if (platform) {
      where.platform = String(platform).toUpperCase();
    }

    const [logs, total] = await Promise.all([
      prisma.platformRateAuditLog.findMany({
        where,
        orderBy: { effectiveAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          admin: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      }),
      prisma.platformRateAuditLog.count({ where })
    ]);

    const formattedLogs = logs.map(l => ({
      ...l,
      previousRate: l.previousCost,
      newRate: l.newCost
    }));

    return Object.assign(formattedLogs, { logs: formattedLogs, total });
  }
}

export const platformRateService = new PlatformRateService();
