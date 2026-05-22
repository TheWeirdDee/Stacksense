import express from 'express';
import { redisClient } from '../redis/client.js';
import { getRepoStats } from '../integrations/github.js';
import { getWalletOnchainStats } from '../integrations/onchain.js';
import { getNpmDownloads } from '../integrations/npm.js';

const router = express.Router();

const DEFAULT_OWNER = process.env.GITHUB_ORG || 'TheWeirdDee';
const DEFAULT_REPO = process.env.GITHUB_REPO || 'Stacksense';
const DEFAULT_NPM = process.env.NPM_PACKAGE || 'stacksense-intel-divine';
const DEFAULT_CONTRACT_OWNER =
  process.env.CONTRACT_OWNER || 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV';

const DEFAULT_CONTRACTS = [
  { address: DEFAULT_CONTRACT_OWNER, name: 'signal-tips' },
  { address: DEFAULT_CONTRACT_OWNER, name: 'subcription-tips' },
];

const PROJECT_KEY = 'project:stacksense';
const SCORE_CACHE_KEY = 'project:score:cache';
const SCORE_CACHE_TTL = 300; // 5 minutes

// ─── POST /api/v1/project/register ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      stacksAddress,
      githubOwner = DEFAULT_OWNER,
      githubRepo = DEFAULT_REPO,
      npmPackage = DEFAULT_NPM,
      contracts = DEFAULT_CONTRACTS,
    } = req.body;

    if (!stacksAddress) {
      return res.status(400).json({ error: 'stacksAddress is required' });
    }

    const project = {
      stacksAddress,
      githubOwner,
      githubRepo,
      npmPackage,
      contracts,
      registeredAt: new Date().toISOString(),
    };

    await redisClient.set(PROJECT_KEY, JSON.stringify(project), {
      EX: 60 * 60 * 24 * 365, // 1 year
    });

    // Invalidate score cache so next GET re-fetches fresh
    await redisClient.del(SCORE_CACHE_KEY);

    res.json({ success: true, project });
  } catch (err: any) {
    console.error('[Project] Register error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to register project' });
  }
});

// ─── GET /api/v1/project/score ───────────────────────────────────────────────
router.get('/score', async (req, res) => {
  try {
    // Return cached score if fresh
    const cached = await redisClient.get(SCORE_CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Load stored project config or fall back to defaults
    const projectStr = await redisClient.get(PROJECT_KEY);
    const project = projectStr
      ? JSON.parse(projectStr)
      : {
          githubOwner: DEFAULT_OWNER,
          githubRepo: DEFAULT_REPO,
          npmPackage: DEFAULT_NPM,
          contracts: DEFAULT_CONTRACTS,
          stacksAddress: DEFAULT_CONTRACT_OWNER,
        };

    // Fetch all 3 signal pillars in parallel
    const [githubStats, onchainStats, npmStats] = await Promise.all([
      getRepoStats(project.githubOwner, project.githubRepo),
      getWalletOnchainStats(project.stacksAddress, project.contracts),
      getNpmDownloads(project.npmPackage),
    ]);

    // Estimate leaderboard tier based on signal thresholds
    // (rough calibration based on known Top 50 requirements)
    const onchainScore = onchainStats.totalTransactions * 10 + onchainStats.totalUniqueCallers * 5;
    const githubScore = githubStats.ecosystemCommits * 20 + githubStats.totalCommits * 2;
    const npmScore = npmStats.monthlyDownloads * 0.1;
    const totalScore = onchainScore + githubScore + npmScore;

    let estimatedTier: string;
    if (totalScore >= 5000) estimatedTier = 'Top 10';
    else if (totalScore >= 2000) estimatedTier = 'Top 25';
    else if (totalScore >= 500) estimatedTier = 'Top 50';
    else estimatedTier = 'Unranked';

    const score = {
      project: {
        githubOwner: project.githubOwner,
        githubRepo: project.githubRepo,
        npmPackage: project.npmPackage,
        stacksAddress: project.stacksAddress,
      },
      github: {
        totalCommits: githubStats.totalCommits,
        ecosystemCommits: githubStats.ecosystemCommits,
        ecosystemRatio: githubStats.ecosystemRatio,
        contributors: githubStats.contributors,
        stars: githubStats.stars,
        lastPushedAt: githubStats.lastPushedAt,
      },
      onchain: {
        totalTransactions: onchainStats.totalTransactions,
        uniqueCallers: onchainStats.totalUniqueCallers,
        feesGeneratedUstx: onchainStats.totalFeesUstx,
        feesGeneratedStx: (onchainStats.totalFeesUstx / 1_000_000).toFixed(4),
        contractDeployments: onchainStats.contractDeployments,
        contracts: onchainStats.contracts.map((c) => ({
          contractId: c.contractId,
          transactions: c.totalTransactions,
          uniqueCallers: c.uniqueCallers,
          feesUstx: c.totalFeesUstx,
        })),
      },
      npm: {
        package: npmStats.package,
        monthlyDownloads: npmStats.monthlyDownloads,
        weeklyDownloads: npmStats.weeklyDownloads,
        averageDailyDownloads: npmStats.averageDailyDownloads,
        peakDailyDownloads: npmStats.peakDailyDownloads,
        dailyBreakdown: npmStats.dailyBreakdown,
      },
      scoring: {
        onchainScore: Math.round(onchainScore),
        githubScore: Math.round(githubScore),
        npmScore: Math.round(npmScore),
        totalScore: Math.round(totalScore),
        estimatedTier,
        thresholds: { top10: 5000, top25: 2000, top50: 500 },
      },
      lastUpdated: new Date().toISOString(),
    };

    await redisClient.set(SCORE_CACHE_KEY, JSON.stringify(score), { EX: SCORE_CACHE_TTL });
    res.json(score);
  } catch (err: any) {
    console.error('[Project] Score error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to compute score' });
  }
});

// ─── POST /api/v1/project/sync ───────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  try {
    await redisClient.del(SCORE_CACHE_KEY);
    res.json({ success: true, message: 'Cache cleared — next GET /score will fetch fresh data' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
