import axios from 'axios';
import { redisClient } from '../redis/client.js';

const GITHUB_API_BASE = 'https://api.github.com';

interface CommitEvent {
  repository: string;
  author: string;
  message: string;
  timestamp: string;
  isStacksEcosystem: boolean;
  url: string;
}

// List of major Stacks ecosystem repositories to track
const STACKS_ECOSYSTEM_REPOS = [
  'stacks-network/stacks-blockchain',
  'stacks-network/stacks-core',
  'clarity-lang/clarity-lang',
  'stacks-network/stacks.js',
  'hirosystems/clarinet',
  'hirosystems/stacks-api',
  'hirosystems/stacksjs',
  'alexgo/alexgo',
  'arkadiko-dao/arkadiko',
  'stacksswap/stacksswap',
  'velarprotocol/velar-protocol',
];

const STACKS_KEYWORDS = [
  'stacks', 'clarity', 'bitcoin', 'btc', 'defi', 'smart contract',
  'stx', 'microblock', 'proof of transfer', 'pox',
];

export async function trackGitHubActivity(username: string) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Fetch user's recent public events
    const response = await axios.get(
      `${GITHUB_API_BASE}/users/${username}/events/public`,
      {
        headers,
        params: { per_page: 30 },
        timeout: 5000,
      }
    );

    const commits: CommitEvent[] = [];

    for (const event of response.data) {
      if (event.type === 'PushEvent') {
        const repo = event.repo.name;
        const isStacksEcosystem = STACKS_ECOSYSTEM_REPOS.includes(repo);

        for (const commit of event.payload.commits) {
          commits.push({
            repository: repo,
            author: event.actor.login,
            message: commit.message,
            timestamp: event.created_at,
            isStacksEcosystem,
            url: commit.url,
          });
        }
      }
    }

    // Store in Redis for analytics
    if (commits.length > 0) {
      const key = `github:commits:${username}:${new Date().toISOString().split('T')[0]}`;
      const existingData = await redisClient.get(key);
      const existing = existingData ? JSON.parse(existingData) : { total: 0, ecosystem: 0, commits };

      const newEcosystemCount = commits.filter((c) => c.isStacksEcosystem).length;

      await redisClient.set(
        key,
        JSON.stringify({
          total: existing.total + commits.length,
          ecosystem: existing.ecosystem + newEcosystemCount,
          commits: [...(existing.commits || []), ...commits],
        }),
        { EX: 604800 } // 7 days
      );
    }

    return {
      username,
      totalCommits: commits.length,
      ecosystemCommits: commits.filter((c) => c.isStacksEcosystem).length,
      commits,
    };
  } catch (error) {
    console.error(`[GitHub] Error tracking activity for ${username}:`, error);
    throw error;
  }
}

export async function getGitHubStats(username: string): Promise<{
  totalCommits: number;
  ecosystemCommits: number;
  ecosystemRatio: number;
}> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Get user info
    const userResponse = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
      headers,
      timeout: 5000,
    });

    const publicRepos = userResponse.data.public_repos;
    const publicGists = userResponse.data.public_gists;

    // Search for Stacks-related commits
    const searchQuery = STACKS_KEYWORDS.map((kw) => `${kw} author:${username}`).join(
      ' OR '
    );

    let ecosystemCount = 0;
    try {
      const searchResponse = await axios.get(`${GITHUB_API_BASE}/search/commits`, {
        headers,
        params: {
          q: searchQuery,
          per_page: 100,
          sort: 'committer-date',
          order: 'desc',
        },
        timeout: 5000,
      });

      ecosystemCount = searchResponse.data.total_count;
    } catch (e) {
      // Fallback if search fails
      const events = await trackGitHubActivity(username);
      ecosystemCount = events.ecosystemCommits;
    }

    return {
      totalCommits: publicRepos * 10, // Estimate based on public repos
      ecosystemCommits: ecosystemCount,
      ecosystemRatio: ecosystemCount / (publicRepos || 1),
    };
  } catch (error) {
    console.error(`[GitHub] Error getting stats for ${username}:`, error);
    throw error;
  }
}

// Register developer
export async function registerDeveloper(username: string, stacksAddress: string) {
  try {
    // Verify GitHub user exists
    await axios.get(`${GITHUB_API_BASE}/users/${username}`, { timeout: 5000 });

    // Store mapping
    await redisClient.set(
      `dev:github:${username}`,
      JSON.stringify({
        stacksAddress,
        registeredAt: new Date().toISOString(),
      }),
      { EX: 31536000 } // 1 year
    );

    // Get initial stats
    const stats = await getGitHubStats(username);

    return {
      username,
      stacksAddress,
      stats,
      message: 'Developer registered successfully',
    };
  } catch (error) {
    console.error(`[GitHub] Error registering developer:`, error);
    throw error;
  }
}

// Get developer ranking
export async function getDeveloperStats(stacksAddress: string) {
  const keys = await redisClient.keys(`dev:github:*`);
  const developers: any[] = [];

  for (const key of keys) {
    const devData = await redisClient.get(key);
    if (!devData) continue;

    const dev = JSON.parse(devData);
    if (dev.stacksAddress === stacksAddress) {
      const username = key.replace('dev:github:', '');
      const stats = await getGitHubStats(username);
      return {
        username,
        ...dev,
        stats,
      };
    }
  }

  return null;
}
// PR: auto-generated branch pr/github-integration
