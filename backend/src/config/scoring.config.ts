/**
 * StyleSense AI - Lead Scoring Configuration
 * 
 * Requirement 3.3:
 * "A 0–100 score per lead combining fit (ICP match) and engagement (opened, replied).
 *  Recompute on every event and record why the score changed.
 *  Weights live in a config file, not scattered as constants through the codebase."
 */

export interface ScoringWeights {
  fit: {
    maxFitScore: number;
    titleWeights: {
      primaryTitles: string[]; // e.g. Head of Merchandising, VP Demand Planning
      primaryWeight: number;
      secondaryTitles: string[]; // e.g. Merchandiser, Supply Chain Analyst, Inventory Specialist
      secondaryWeight: number;
      defaultWeight: number;
    };
    companySizeWeights: {
      ranges: { min: number; max: number; weight: number }[];
      defaultWeight: number;
    };
    industryWeights: {
      targetIndustries: string[];
      matchWeight: number;
      defaultWeight: number;
    };
    regionWeights: {
      targetRegions: string[];
      matchWeight: number;
      defaultWeight: number;
    };
  };
  engagement: {
    maxEngagementScore: number;
    events: {
      delivered: number;
      opened: number;
      clicked: number;
    };
    replyIntents: {
      interested: number;
      needs_info: number;
      not_now: number;
      wrong_person: number;
      unsubscribe: number; // Penalty/reset
    };
  };
  thresholds: {
    hot: number;  // >= 75
    warm: number; // >= 45 and < 75
    cold: number; // < 45
  };
}

export const SCORING_CONFIG: ScoringWeights = {
  fit: {
    maxFitScore: 50,
    titleWeights: {
      primaryTitles: [
        "Head of Merchandising",
        "VP Merchandising",
        "Director of Merchandising",
        "Chief Merchandising Officer",
        "VP Supply Chain",
        "Head of Supply Chain",
        "Director of Demand Planning",
        "Head of Demand Planning",
        "VP Inventory",
        "Director of Inventory Allocation"
      ],
      primaryWeight: 25,
      secondaryTitles: [
        "Senior Merchandiser",
        "Demand Planner",
        "Supply Chain Manager",
        "Inventory Planner",
        "Merchandise Planner",
        "Operations Director"
      ],
      secondaryWeight: 15,
      defaultWeight: 5
    },
    companySizeWeights: {
      ranges: [
        { min: 50, max: 200, weight: 12 },
        { min: 201, max: 1000, weight: 15 }, // Sweet spot for StyleSense AI
        { min: 1001, max: 5000, weight: 10 },
        { min: 5001, max: 100000, weight: 8 }
      ],
      defaultWeight: 5
    },
    industryWeights: {
      targetIndustries: [
        "Apparel & Fashion",
        "Apparel",
        "Fashion",
        "Footwear & Accessories",
        "Luxury Goods & Jewelry",
        "Retail Apparel"
      ],
      matchWeight: 10,
      defaultWeight: 2
    },
    regionWeights: {
      targetRegions: [
        "North America",
        "United States",
        "Canada",
        "Europe",
        "United Kingdom"
      ],
      matchWeight: 5,
      defaultWeight: 2
    }
  },
  engagement: {
    maxEngagementScore: 50,
    events: {
      delivered: 5,
      opened: 15,
      clicked: 10
    },
    replyIntents: {
      interested: 30,
      needs_info: 20,
      not_now: 5,
      wrong_person: 0,
      unsubscribe: -100 // Leads to total score reset to 0
    }
  },
  thresholds: {
    hot: 75,
    warm: 45,
    cold: 0
  }
};
