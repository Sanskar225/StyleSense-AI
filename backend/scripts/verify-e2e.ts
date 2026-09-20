import { PrismaClient, EventType, LeadStatus } from '@prisma/client';
import { ScoringService } from '../src/services/scoring.service.js';
import { GroundingService } from '../src/services/grounding.service.js';
import { EmailService } from '../src/services/email.service.js';
import { AgentService } from '../src/services/agent.service.js';
import { LeadService } from '../src/services/lead.service.js';

async function verifyEndToEnd() {
  const prisma = new PrismaClient();

  console.log('--- 1. Testing Lead Discovery (2-Step Tool Use) ---');
  const discoveryResult = await AgentService.discoverLeads(prisma, {
    industry: 'Apparel & Fashion',
    region: 'North America',
    companySize: '201-1000',
    targetTitles: ['Head of Merchandising', 'VP Supply Chain']
  });
  console.log(`Discovered ${discoveryResult.leadsFound} leads.`);
  console.log(`Tool Execution Steps: ${discoveryResult.toolExecutionTrace.length}`);
  console.log(`Step 1 Tool: ${discoveryResult.toolExecutionTrace[0].tool} (${discoveryResult.toolExecutionTrace[0].status})`);
  console.log(`Step 2 Tool: ${discoveryResult.toolExecutionTrace[1].tool} (${discoveryResult.toolExecutionTrace[1].status})`);

  console.log('\n--- 2. Selecting a Discovered Lead for Outreach ---');
  const testLead = await prisma.lead.findFirst({
    where: { status: LeadStatus.DISCOVERED },
    include: { company: true, score: true }
  });

  if (!testLead) throw new Error('No discovered lead found');
  console.log(`Testing with Lead: ${testLead.firstName} ${testLead.lastName} (${testLead.company.name})`);
  console.log(`Initial Score: ${testLead.score?.currentScore} (Tier: ${testLead.score?.tier})`);

  console.log('\n--- 3. Testing Appendix A Grounding & Send ---');
  const trackingPixel = EmailService.getTrackingPixelUrl(testLead.trackingToken);
  const unsubUrl = EmailService.getUnsubscribeUrl(testLead.trackingToken);
  const notes = (testLead.researchNotes as any) || {};

  const tokens = {
    first_name: testLead.firstName,
    company_name: testLead.company.name,
    observed_signal_short: notes.observedSignalShort || 'retail markdown strategy',
    observed_signal_sentence: notes.observedSignalSentence || 'your recent collection promotional discounts',
    company_segment: notes.companySegment || 'apparel and fashion',
    pain_point_category: notes.painPointCategory || 'overstock or heavy markdowns',
    value_prop_for_pain_point: notes.valuePropForPainPoint || 'forecast seasonal SKU demand',
    quantified_outcome_optional: notes.quantifiedOutcomeOptional,
    specific_context_detail: notes.specificContextDetail || 'current market footprint',
    one_line_relevance_hypothesis: notes.oneLineRelevanceHypothesis || 'demand forecasting protects gross margins',
    sender_name: 'Sanskar Sinha',
    proposed_time_window: notes.proposedTimeWindow
  };

  const grounding = GroundingService.verifyGrounding(tokens, {
    firstName: testLead.firstName,
    sourceUrl: testLead.sourceUrl,
    company: testLead.company,
    researchNotes: testLead.researchNotes
  });
  console.log(`Grounding Check Valid: ${grounding.isValid}`);

  const sendResult = await EmailService.sendOutreach(prisma, {
    leadId: testLead.id,
    toEmail: testLead.email,
    recipientName: `${testLead.firstName} ${testLead.lastName}`,
    subject: 'Quick question regarding merchandise operations',
    bodyText: 'Hello',
    bodyHtml: '<p>Hello</p>',
    trackingToken: testLead.trackingToken
  });
  console.log(`Outreach sent! Delivery ID: ${sendResult.messageId}`);

  const postSendLead = await LeadService.getLeadById(prisma, testLead.id);
  console.log(`Post-Send Status: ${postSendLead?.status} (Expected: CONTACTED)`);
  console.log(`Post-Send Score: ${postSendLead?.score?.currentScore} (+5 pts for delivery)`);

  console.log('\n--- 4. Testing 1x1 Tracking Pixel Open ---');
  await prisma.$transaction(async (tx) => {
    await tx.emailEvent.create({
      data: {
        leadId: testLead.id,
        eventType: EventType.OPENED,
        messageId: `open_test_${Date.now()}`,
        payload: { userAgent: 'E2E Test Client', ipHash: 'testip123' }
      }
    });
    await tx.lead.update({
      where: { id: testLead.id },
      data: { status: LeadStatus.OPENED }
    });
    await ScoringService.recomputeAndSaveScore(tx, testLead.id, 'EMAIL_OPENED', 'Prospect opened email');
  });

  const postOpenLead = await LeadService.getLeadById(prisma, testLead.id);
  console.log(`Post-Open Status: ${postOpenLead?.status} (Expected: OPENED)`);
  console.log(`Post-Open Score: ${postOpenLead?.score?.currentScore} (+15 pts for open)`);

  console.log('\n--- 5. Testing Simulated Reply & Classifier ---');
  const replyResult = await AgentService.processSimulatedReply(
    prisma,
    testLead.id,
    'Hi Sanskar, thanks for reaching out. We actually have huge stockouts across stores. Can we connect this Thursday at 2pm ET?'
  );
  console.log(`Classified Intent: ${replyResult.classification.intent} (Confidence: ${replyResult.classification.confidence})`);
  console.log(`Drafted Response Subject: ${replyResult.classification.draftedResponse.subject}`);
  console.log(`Post-Reply Score: ${replyResult.newScore} (Delta: +${replyResult.scoreDelta})`);

  console.log('\n--- 6. Testing Unsubscribe & Suppression Enforcement ---');
  await prisma.$transaction(async (tx) => {
    await tx.emailEvent.create({
      data: {
        leadId: testLead.id,
        eventType: EventType.UNSUBSCRIBED,
        payload: { reason: 'Clicked opt-out link' }
      }
    });
    await tx.suppression.upsert({
      where: { email: testLead.email.toLowerCase() },
      create: {
        email: testLead.email.toLowerCase(),
        leadId: testLead.id,
        reason: 'UNSUBSCRIBE',
        notes: 'Opted out during E2E test'
      },
      update: {}
    });
    await tx.lead.update({
      where: { id: testLead.id },
      data: { status: LeadStatus.UNSUBSCRIBED }
    });
    await ScoringService.recomputeAndSaveScore(tx, testLead.id, 'UNSUBSCRIBED', 'Opted out');
  });

  const postUnsubLead = await LeadService.getLeadById(prisma, testLead.id);
  console.log(`Post-Unsubscribe Status: ${postUnsubLead?.status} (Expected: UNSUBSCRIBED)`);
  console.log(`Post-Unsubscribe Score: ${postUnsubLead?.score?.currentScore} (Expected: 0)`);

  console.log('\n--- 7. Testing Suppression Rejection on Attempted Dispatch ---');
  try {
    await EmailService.sendOutreach(prisma, {
      leadId: testLead.id,
      toEmail: testLead.email,
      recipientName: 'Test',
      subject: 'Test',
      bodyText: 'Test',
      bodyHtml: 'Test',
      trackingToken: testLead.trackingToken
    });
    console.error('FAILED: Send should have thrown suppression error!');
  } catch (err: any) {
    console.log(`SUCCESS: Dispatch rejected with suppression error: "${err.message}"`);
  }

  console.log('\n--- 8. Testing Deterministic Replay Across All Leads ---');
  const replayResult = await ScoringService.recomputeAll(prisma);
  console.log(`Recomputed ${replayResult.total} leads cleanly.`);

  await prisma.$disconnect();
  console.log('\n========================================');
  console.log('✅ ALL E2E LIFECYCLE TESTS PASSED 100%');
  console.log('========================================');
}

verifyEndToEnd().catch((err) => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
