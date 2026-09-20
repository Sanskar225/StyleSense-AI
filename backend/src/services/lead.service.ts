import { PrismaClient, LeadStatus, ScoreTier } from '@prisma/client';
import { ScoringService } from './scoring.service.js';

export interface LeadFilterOptions {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  tier?: ScoreTier;
  search?: string;
  sortBy?: 'score' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export class LeadService {
  /**
   * List leads with pagination, filtering, search, and sorting by score
   */
  public static async listLeads(prisma: PrismaClient, options: LeadFilterOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.tier) {
      where.score = {
        tier: options.tier
      };
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { jobTitle: { contains: term, mode: 'insensitive' } },
        { company: { name: { contains: term, mode: 'insensitive' } } }
      ];
    }

    // Determine sorting
    let orderBy: any = [];
    if (options.sortBy === 'score' || !options.sortBy) {
      orderBy = [
        { score: { currentScore: options.sortOrder || 'desc' } },
        { createdAt: 'desc' }
      ];
    } else if (options.sortBy === 'createdAt') {
      orderBy = [{ createdAt: options.sortOrder || 'desc' }];
    } else if (options.sortBy === 'name') {
      orderBy = [{ lastName: options.sortOrder || 'asc' }];
    }

    const [totalCount, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          company: true,
          score: true,
          suppression: true,
          _count: {
            select: { events: true }
          }
        },
        orderBy,
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: leads,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get single lead by ID with complete relations, score history, and raw events
   */
  public static async getLeadById(prisma: PrismaClient, id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        company: true,
        score: true,
        suppression: true,
        scoreHistory: {
          orderBy: { createdAt: 'desc' },
          take: 25
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 25
        }
      }
    });

    return lead;
  }

  /**
   * Aggregate pipeline metrics for the console dashboard
   */
  public static async getPipelineMetrics(prisma: PrismaClient) {
    const [
      totalLeads,
      discoveredCount,
      contactedCount,
      openedCount,
      repliedCount,
      unsubscribedCount,
      hotCount,
      warmCount,
      coldCount,
      scoreAggregate
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'DISCOVERED' } }),
      prisma.lead.count({ where: { status: 'CONTACTED' } }),
      prisma.lead.count({ where: { status: 'OPENED' } }),
      prisma.lead.count({ where: { status: 'REPLIED' } }),
      prisma.lead.count({ where: { status: 'UNSUBSCRIBED' } }),
      prisma.leadScore.count({ where: { tier: 'HOT' } }),
      prisma.leadScore.count({ where: { tier: 'WARM' } }),
      prisma.leadScore.count({ where: { tier: 'COLD' } }),
      prisma.leadScore.aggregate({
        _avg: { currentScore: true }
      })
    ]);

    const deliveredOrContacted = contactedCount + openedCount + repliedCount;
    const openRate = deliveredOrContacted > 0 ? (((openedCount + repliedCount) / deliveredOrContacted) * 100).toFixed(1) : '0.0';
    const replyRate = deliveredOrContacted > 0 ? ((repliedCount / deliveredOrContacted) * 100).toFixed(1) : '0.0';
    const averageScore = scoreAggregate._avg.currentScore ? Math.round(scoreAggregate._avg.currentScore) : 0;

    return {
      totalLeads,
      byStatus: {
        discovered: discoveredCount,
        contacted: contactedCount,
        opened: openedCount,
        replied: repliedCount,
        unsubscribed: unsubscribedCount
      },
      byTier: {
        hot: hotCount,
        warm: warmCount,
        cold: coldCount
      },
      rates: {
        openRatePercent: parseFloat(openRate),
        replyRatePercent: parseFloat(replyRate),
        averageScore
      }
    };
  }
}
