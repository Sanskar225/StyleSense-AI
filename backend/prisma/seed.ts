import { PrismaClient, LeadStatus, EventType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ScoringService } from '../src/services/scoring.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding StyleSense AI database...');

  // 1. Clean existing records
  await prisma.scoreHistory.deleteMany();
  await prisma.leadScore.deleteMany();
  await prisma.emailEvent.deleteMany();
  await prisma.suppression.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'sales@stylesense.ai',
      name: 'Sanskar Sinha',
      passwordHash,
      role: 'account_executive'
    }
  });
  console.log(`Created user: ${user.email} (Password: password123)`);

  // 3. Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Q3 North America Fashion Merchandising & Inventory Allocation',
      description: 'Outreach campaign targeting apparel brands struggling with markdown pressures and stockouts.',
      status: 'ACTIVE',
      createdById: user.id,
      icpCriteria: {
        industry: 'Apparel & Fashion',
        region: 'North America',
        companySize: '50-1000',
        targetTitles: [
          'Head of Merchandising',
          'Director of Demand Planning',
          'VP Supply Chain',
          'Inventory Allocation Manager'
        ]
      }
    }
  });

  // 4. Create Companies & Grounded Leads
  const companyData = [
    {
      name: 'KnitWell Apparel',
      domain: 'knitwellapparel.com',
      industry: 'Apparel & Fashion',
      sizeRange: '201-1000',
      region: 'North America',
      website: 'https://knitwellapparel.com',
      description: 'Contemporary knitwear brand with 35 retail locations and high-growth eCommerce.',
      signals: {
        headline: 'Heavy end-of-season knitwear markdowns noted in retail stores',
        markdownRate: '35% off across seasonal capsules',
        hiring: 'Open search for Director of Merchandise Planning'
      },
      lead: {
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@knitwellapparel.com',
        jobTitle: 'Head of Merchandising',
        department: 'Merchandising',
        sourceUrl: 'https://fashionnetwork.com/news/knitwell-expands-retail-markdown-strategy,149201.html',
        status: LeadStatus.OPENED,
        researchNotes: {
          observedSignalShort: 'spring knitwear markdowns',
          observedSignalSentence: 'your recent retail promotional push discounting the Spring Cable collection by 35%',
          companySegment: 'contemporary knitwear',
          painPointCategory: 'overstock or heavy markdowns',
          valuePropForPainPoint: 'forecast seasonal SKU demand with pinpoint granularity',
          quantifiedOutcomeOptional: 'reducing end-of-season markdown burn by up to 24%',
          specificContextDetail: 'rapid rollout to 35 physical doors alongside eCommerce growth',
          oneLineRelevanceHypothesis: 'pre-season size curves and store-level demand forecasting could protect your gross margins',
          proposedTimeWindow: 'this Thursday at 2pm ET',
          optionalSoftProofPoint: 'Brands like Reformation and Everlane saw a 22% reduction in deadstock within their first two quarters.'
        }
      }
    },
    {
      name: 'Aura Activewear',
      domain: 'auraactivewear.com',
      industry: 'Apparel & Fashion',
      sizeRange: '50-200',
      region: 'North America',
      website: 'https://auraactivewear.com',
      description: 'Direct-to-consumer high-performance activewear and technical apparel.',
      signals: {
        headline: 'Surge in customer sizing inquiries and return rates following seamless legging launch',
        returnRateEstimate: '28% return rate on technical compression wear',
        hiring: 'Hiring VP of Supply Chain'
      },
      lead: {
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@auraactivewear.com',
        jobTitle: 'VP Supply Chain',
        department: 'Supply Chain',
        sourceUrl: 'https://retaildive.com/news/activewear-sizing-and-return-logistics-aura/682912/',
        status: LeadStatus.REPLIED,
        researchNotes: {
          observedSignalShort: 'seamless collection return discussions',
          observedSignalSentence: 'public feedback regarding sizing variations across your new compression legging drop',
          companySegment: 'DTC performance activewear',
          painPointCategory: 'high return rates or sizing complaints',
          valuePropForPainPoint: 'eliminate fit uncertainty and streamline return logistics',
          quantifiedOutcomeOptional: 'slashing size-related return volumes by 30%',
          specificContextDetail: 'expansion into technical seamless compression fabrics',
          oneLineRelevanceHypothesis: 'AI-driven size recommendation and return risk scoring will boost first-purchase retention',
          proposedTimeWindow: 'early next week',
          optionalSoftProofPoint: 'Our activewear partners achieved an 18% improvement in keep-rate in 60 days.'
        }
      }
    },
    {
      name: 'Nordic Loom',
      domain: 'nordicloom.com',
      industry: 'Apparel & Fashion',
      sizeRange: '201-1000',
      region: 'Europe',
      website: 'https://nordicloom.com',
      description: 'Sustainable Scandinavian minimalist apparel brand expanding wholesale across Europe.',
      signals: {
        headline: 'Sustainability report highlights commitment to zero overproduction and deadstock reduction',
        initiative: 'Circular textile mandate 2026'
      },
      lead: {
        firstName: 'Chloe',
        lastName: 'Bennett',
        email: 'chloe.bennett@nordicloom.com',
        jobTitle: 'Director of Demand Planning',
        department: 'Demand Planning',
        sourceUrl: 'https://sustainablefashion.org/case-studies/nordic-loom-overproduction-initiative/',
        status: LeadStatus.CONTACTED,
        researchNotes: {
          observedSignalShort: 'zero-overproduction circularity goal',
          observedSignalSentence: 'Nordic Loom\'s pledge to cut raw fabric waste and eliminate unsold seasonal overproduction',
          companySegment: 'sustainable womenswear',
          painPointCategory: 'overstock or heavy markdowns',
          valuePropForPainPoint: 'align production volumes strictly with true consumer demand signals',
          quantifiedOutcomeOptional: 'preventing excess inventory before fabric is cut',
          specificContextDetail: 'public commitment to circular production without deadstock',
          oneLineRelevanceHypothesis: 'AI demand intelligence directly prevents inventory waste before wholesale purchase orders are locked',
          proposedTimeWindow: 'this Wednesday morning',
          optionalSoftProofPoint: 'Nordic brands partnering with us saw their sell-through rate hit 88% at full retail price.'
        }
      }
    },
    {
      name: 'Urban Stitch Co',
      domain: 'urbanstitchco.com',
      industry: 'Apparel & Fashion',
      sizeRange: '501-1000',
      region: 'North America',
      website: 'https://urbanstitchco.com',
      description: 'Fast-growing streetwear label with high wholesale demand across 120 stockists.',
      signals: {
        headline: 'Customer complaints on Reddit/Twitter regarding stockouts of core denim styles in flagship stores',
        stockoutRate: 'Frequent out-of-stock notices on waist sizes 30-34'
      },
      lead: {
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@urbanstitchco.com',
        jobTitle: 'Head of Demand Planning',
        department: 'Demand Planning',
        sourceUrl: 'https://complex.com/style/urban-stitch-co-expansion-wholesale-retail-demands',
        status: LeadStatus.DISCOVERED,
        researchNotes: {
          observedSignalShort: 'core denim stockouts',
          observedSignalSentence: 'frequent stockouts across core denim waist sizes in your Manhattan and LA flagship doors',
          companySegment: 'streetwear and denim',
          painPointCategory: 'stockouts across channels or stores',
          valuePropForPainPoint: 'dynamically balance inventory between regional distribution hubs and retail stores',
          quantifiedOutcomeOptional: 'recovering up to 14% in lost omnichannel revenue',
          specificContextDetail: 'rapid store additions outpacing centralized warehouse replenishment',
          oneLineRelevanceHypothesis: 'store-level inventory allocation optimisation ensures key sizes remain in stock without overstocking regional hubs',
          proposedTimeWindow: 'this Friday afternoon',
          optionalSoftProofPoint: 'Omnichannel retailers saw a 28% drop in out-of-stock lost sales within 90 days.'
        }
      }
    },
    {
      name: 'Verona Footwear',
      domain: 'veronafootwear.com',
      industry: 'Apparel & Fashion',
      sizeRange: '50-200',
      region: 'Europe',
      website: 'https://veronafootwear.com',
      description: 'Handcrafted Italian leather footwear company transitioning to direct eCommerce.',
      signals: {
        headline: 'Pivot from boutique wholesale to global Shopify Plus DTC store'
      },
      lead: {
        firstName: 'Rachel',
        lastName: 'Adams',
        email: 'rachel.adams@veronafootwear.com',
        jobTitle: 'Merchandise Planner',
        department: 'Merchandising',
        sourceUrl: 'https://footwearnews.com/business/verona-footwear-dtc-expansion-italian-craft-12948/',
        status: LeadStatus.DISCOVERED,
        researchNotes: {
          observedSignalShort: 'global DTC eCommerce transition',
          observedSignalSentence: 'Verona\'s recent migration to direct-to-consumer sales on Shopify Plus',
          companySegment: 'luxury leather footwear',
          painPointCategory: 'slow reaction to trends',
          valuePropForPainPoint: 'anticipate trend shifts in silhouette and leather finishes weeks ahead of order lead times',
          quantifiedOutcomeOptional: '',
          specificContextDetail: 'long Italian artisan production lead times requiring early trend confidence',
          oneLineRelevanceHypothesis: 'trend intelligence empowers your merchandising team to place confident advance leather orders',
          proposedTimeWindow: '',
          optionalSoftProofPoint: ''
        }
      }
    },
    {
      name: 'Beacon Denim',
      domain: 'beacondenim.com',
      industry: 'Apparel & Fashion',
      sizeRange: '201-500',
      region: 'North America',
      website: 'https://beacondenim.com',
      description: 'American heritage raw denim and workwear manufacturer.',
      signals: {
        headline: 'Wholesale partner expansion and seasonal inventory management challenges'
      },
      lead: {
        firstName: 'Thomas',
        lastName: 'Gray',
        email: 'thomas.gray@beacondenim.com',
        jobTitle: 'Operations Director',
        department: 'Supply Chain',
        sourceUrl: 'https://sourcingjournal.com/denim/beacon-denim-raw-materials-supply-chain-2026/',
        status: LeadStatus.UNSUBSCRIBED,
        researchNotes: {
          observedSignalShort: 'fabric sourcing expansion',
          observedSignalSentence: 'your recent scale-up of raw denim mills in North Carolina',
          companySegment: 'heritage workwear',
          painPointCategory: 'overstock or heavy markdowns',
          valuePropForPainPoint: 'optimize fabric buy volumes and prevent finished goods overstock',
          quantifiedOutcomeOptional: 'improving gross margins by 4.5 points',
          specificContextDetail: 'inflexible 6-month mill lead times',
          oneLineRelevanceHypothesis: 'accurate demand forecasting prevents dead stock in non-core washes',
          proposedTimeWindow: 'next week',
          optionalSoftProofPoint: ''
        }
      }
    }
  ];

  for (const item of companyData) {
    const company = await prisma.company.create({
      data: {
        name: item.name,
        domain: item.domain,
        industry: item.industry,
        sizeRange: item.sizeRange,
        region: item.region,
        website: item.website,
        description: item.description,
        signals: item.signals
      }
    });

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        firstName: item.lead.firstName,
        lastName: item.lead.lastName,
        email: item.lead.email,
        jobTitle: item.lead.jobTitle,
        department: item.lead.department,
        sourceUrl: item.lead.sourceUrl,
        status: item.lead.status,
        researchNotes: item.lead.researchNotes
      }
    });

    // Create realistic initial events based on status
    if (item.lead.status === LeadStatus.CONTACTED || item.lead.status === LeadStatus.OPENED || item.lead.status === LeadStatus.REPLIED) {
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          eventType: EventType.DELIVERED,
          messageId: `msg_${Date.now()}_seed1@stylesense.ai`,
          payload: { subject: `${company.name}’s ${item.lead.researchNotes.observedSignalShort} - quick question`, provider: 'sandbox' }
        }
      });
    }

    if (item.lead.status === LeadStatus.OPENED || item.lead.status === LeadStatus.REPLIED) {
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          eventType: EventType.OPENED,
          messageId: `msg_${Date.now()}_seed1@stylesense.ai`,
          payload: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', ipHash: 'a1b2c3d4' }
        }
      });
    }

    if (item.lead.status === LeadStatus.REPLIED) {
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          eventType: EventType.REPLIED,
          messageId: `reply_${Date.now()}_seed1@stylesense.ai`,
          payload: {
            replyText: 'Hey, this is very timely. We are launching our summer capsule next month and already nervous about markdown risks and stockouts. Send over some calendar slots to chat.',
            intent: 'interested',
            confidence: 0.95
          }
        }
      });
    }

    if (item.lead.status === LeadStatus.UNSUBSCRIBED) {
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          eventType: EventType.UNSUBSCRIBED,
          payload: { reason: 'User clicked unsubscribe link in email footer' }
        }
      });
      // Add to suppression list
      await prisma.suppression.create({
        data: {
          email: item.lead.email,
          leadId: lead.id,
          reason: 'UNSUBSCRIBE',
          notes: 'Unsubscribed during seed initialization'
        }
      });
    }

    // Compute initial score & audit history
    await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'INITIAL_SEED_EVALUATION', 'Initial seed data calculation');
    console.log(`Seeded lead: ${lead.firstName} ${lead.lastName} (${company.name}) - Status: ${lead.status}`);
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
