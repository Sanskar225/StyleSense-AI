import { describe, it, expect } from 'vitest';
import { GroundingService, AppendixATokens, PAIN_POINT_CAPABILITY_MAP } from '../src/services/grounding.service.js';

describe('GroundingService — Appendix A Grounding & Hallucination Blocker', () => {
  const validLead = {
    firstName: 'Elena',
    sourceUrl: 'https://fashionnetwork.com/news/knitwell-expands-retail-markdown-strategy',
    company: {
      name: 'KnitWell Apparel',
      domain: 'knitwellapparel.com',
      industry: 'Apparel & Fashion',
      region: 'North America'
    },
    researchNotes: {
      observedSignalShort: 'spring knitwear markdowns',
      observedSignalSentence: 'your recent retail promotional push discounting the Spring Cable collection by 35%'
    }
  };

  const validTokens: AppendixATokens = {
    first_name: 'Elena',
    company_name: 'KnitWell Apparel',
    observed_signal_short: 'spring knitwear markdowns',
    observed_signal_sentence: 'your recent retail promotional push discounting the Spring Cable collection by 35%',
    company_segment: 'contemporary knitwear',
    pain_point_category: 'overstock or heavy markdowns',
    value_prop_for_pain_point: 'forecast seasonal SKU demand with pinpoint granularity',
    quantified_outcome_optional: 'reducing end-of-season markdown burn by up to 24%',
    specific_context_detail: 'rapid rollout to 35 physical doors alongside eCommerce growth',
    one_line_relevance_hypothesis: 'pre-season size curves and store-level demand forecasting could protect your gross margins',
    sender_name: 'Sanskar Sinha',
    proposed_time_window: 'this Thursday at 2pm ET',
    optional_soft_proof_point: 'Brands like Reformation and Everlane saw a 22% reduction in deadstock within two quarters.'
  };

  it('passes grounding check when all tokens align with stored research records', () => {
    const result = GroundingService.verifyGrounding(validTokens, validLead);
    expect(result.isValid).toBe(true);
    expect(result.blockedTokens.length).toBe(0);
    expect(result.logEntry.action).toBe('PASSED');
  });

  it('blocks token filling when an unverifiable claim or buzzword is injected', () => {
    const corruptedTokens: AppendixATokens = {
      ...validTokens,
      value_prop_for_pain_point: 'deliver cutting-edge AI and magic solution for all inventory'
    };

    const result = GroundingService.verifyGrounding(corruptedTokens, validLead);
    expect(result.isValid).toBe(false);
    expect(result.blockedTokens).toContain('value_prop_for_pain_point');
    expect(result.logEntry.action).toBe('BLOCKED');
  });

  it('blocks token filling when pain point does not map to Appendix A capabilities', () => {
    const unmappedTokens: AppendixATokens = {
      ...validTokens,
      pain_point_category: 'crypto currency payment gateway'
    };

    const result = GroundingService.verifyGrounding(unmappedTokens, validLead);
    expect(result.isValid).toBe(false);
    expect(result.blockedTokens).toContain('pain_point_category');
  });

  it('renders Appendix A email with locked copy and proper four-sentence skeleton order', () => {
    const email = GroundingService.renderEmail(
      validTokens,
      'http://localhost:4000/api/tracking/pixel/token123.png',
      'http://localhost:4000/api/tracking/unsubscribe/token123'
    );

    expect(email.subject).toContain('KnitWell Apparel’s spring knitwear markdowns - quick question');
    expect(email.bodyText).toContain('Hi Elena,');
    expect(email.bodyText).toContain('I noticed your recent retail promotional push discounting the Spring Cable collection by 35%.');
    expect(email.bodyText).toContain('At StyleSense AI, we help apparel and fashion contemporary knitwear teams forecast seasonal SKU demand with pinpoint granularity - reducing end-of-season markdown burn by up to 24%.');
    expect(email.bodyText).toContain('Would you be open to a 15-minute call this Thursday at 2pm ET to see if it’s a fit?');
    expect(email.bodyText).toContain('Best,\nSanskar Sinha\nStyleSense AI');
    expect(email.bodyHtml).toContain('http://localhost:4000/api/tracking/pixel/token123.png');
    expect(email.bodyHtml).toContain('http://localhost:4000/api/tracking/unsubscribe/token123');
  });

  it('cleanly omits optional tokens when not provided without leaving dangling placeholders', () => {
    const minimalTokens: AppendixATokens = {
      first_name: 'Elena',
      company_name: 'KnitWell Apparel',
      observed_signal_short: 'spring knitwear markdowns',
      observed_signal_sentence: 'your recent retail promotional push discounting the Spring Cable collection by 35%',
      company_segment: 'contemporary knitwear',
      pain_point_category: 'overstock or heavy markdowns',
      value_prop_for_pain_point: 'forecast seasonal SKU demand',
      specific_context_detail: 'store expansion',
      one_line_relevance_hypothesis: 'demand forecasting protects margins',
      sender_name: 'Sanskar'
    };

    const email = GroundingService.renderEmail(minimalTokens);
    expect(email.bodyText).not.toContain('undefined');
    expect(email.bodyText).not.toContain('P.S.');
    expect(email.bodyText).toContain('Would you be open to a 15-minute call to see if it’s a fit?');
  });
});
