/**
 * StyleSense AI - Reply Classification Evaluation Script
 * 
 * Requirement 3.4 & Deliverable:
 * "Hand-label 5–8 example replies and ship a small script that reports classification
 *  accuracy against them. This is the only evaluation artifact required; keep it lightweight."
 * 
 * Run with: npm run eval:replies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClassifierService, ReplyIntent } from '../backend/src/services/classifier.service.js';

interface TestReply {
  id: string;
  prospect: string;
  company: string;
  text: string;
  expectedIntent: ReplyIntent;
  notes: string;
}

interface EvaluationRow {
  id: string;
  prospect: string;
  company: string;
  expected: ReplyIntent;
  predicted: ReplyIntent;
  confidence: number;
  match: boolean;
}

function runEvaluation() {
  console.log('========================================================================');
  console.log('       StyleSense AI — Inbound Reply Classification Benchmark           ');
  console.log('========================================================================\n');

  // Locate dataset
  let datasetPath = path.resolve(process.cwd(), 'eval', 'test_replies.json');
  if (!fs.existsSync(datasetPath)) {
    datasetPath = path.resolve(process.cwd(), '..', 'eval', 'test_replies.json');
  }

  if (!fs.existsSync(datasetPath)) {
    console.error(`[ERROR] Test dataset not found at ${datasetPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf8');
  const dataset: TestReply[] = JSON.parse(rawData);

  console.log(`Loaded ${dataset.length} hand-labeled fashion prospect replies for evaluation.\n`);

  const results: EvaluationRow[] = [];
  let correctCount = 0;
  const perIntentStats: Record<string, { total: number; correct: number }> = {
    interested: { total: 0, correct: 0 },
    needs_info: { total: 0, correct: 0 },
    not_now: { total: 0, correct: 0 },
    wrong_person: { total: 0, correct: 0 },
    unsubscribe: { total: 0, correct: 0 }
  };

  for (const item of dataset) {
    const classification = ClassifierService.classifyReply(item.text, {
      prospectName: item.prospect.split(' ')[0],
      companyName: item.company
    });

    const isMatch = classification.intent === item.expectedIntent;
    if (isMatch) {
      correctCount++;
    }

    if (perIntentStats[item.expectedIntent]) {
      perIntentStats[item.expectedIntent].total++;
      if (isMatch) perIntentStats[item.expectedIntent].correct++;
    }

    results.push({
      id: item.id,
      prospect: item.prospect,
      company: item.company,
      expected: item.expectedIntent,
      predicted: classification.intent,
      confidence: classification.confidence,
      match: isMatch
    });
  }

  // Print table
  console.log('| ID       | Prospect         | Company           | Expected      | Predicted     | Conf  | Result  |');
  console.log('|----------|------------------|-------------------|---------------|---------------|-------|---------|');

  for (const r of results) {
    const idPad = r.id.padEnd(8);
    const prospectPad = r.prospect.padEnd(16);
    const compPad = r.company.padEnd(17);
    const expPad = r.expected.padEnd(13);
    const predPad = r.predicted.padEnd(13);
    const confPad = (r.confidence.toFixed(2)).padEnd(5);
    const status = r.match ? '✅ PASS' : '❌ FAIL';

    console.log(`| ${idPad} | ${prospectPad} | ${compPad} | ${expPad} | ${predPad} | ${confPad} | ${status} |`);
  }

  const accuracy = (correctCount / dataset.length) * 100;

  console.log('\n------------------------------------------------------------------------');
  console.log('Per-Intent Performance Summary:');
  for (const [intent, stats] of Object.entries(perIntentStats)) {
    const pct = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 'N/A';
    console.log(`  • ${intent.padEnd(14)}: ${stats.correct}/${stats.total} correct (${pct}%)`);
  }

  console.log('------------------------------------------------------------------------');
  console.log(`Overall Accuracy: ${correctCount} / ${dataset.length} (${accuracy.toFixed(1)}%)`);
  console.log('========================================================================\n');

  if (accuracy >= 85) {
    console.log('🎉 Benchmark PASSED: Classification accuracy satisfies assignment requirements.\n');
  } else {
    console.warn('⚠️ Benchmark WARNING: Accuracy below target threshold.\n');
  }
}

runEvaluation();
