import express from 'express';
import { registerDeveloper, getDeveloperStats, trackGitHubActivity } from '../integrations/github.js';

const router = express.Router();

const STACKS_ADDR_RE = /^(SP|SM)[A-Z0-9]{28,40}$/;

router.post('/register', async (req, res) => {
  try {
    const { username, stacksAddress } = req.body;

    if (!username || !stacksAddress) {
      return res.status(400).json({ error: 'username and stacksAddress are required' });
    }

    if (typeof username !== 'string' || username.length > 39) {
      return res.status(400).json({ error: 'Invalid GitHub username' });
    }

    if (typeof stacksAddress !== 'string' || !STACKS_ADDR_RE.test(stacksAddress)) {
      return res.status(400).json({ error: 'Invalid Stacks address' });
    }

    const result = await registerDeveloper(username, stacksAddress);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to register developer' });
  }
});

router.get('/stats/:stacksAddress', async (req, res) => {
  try {
    const { stacksAddress } = req.params;
    const stats = await getDeveloperStats(stacksAddress);

    if (!stats) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

router.post('/sync/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await trackGitHubActivity(username);

    res.json({
      message: 'GitHub activity synced',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync activity' });
  }
});

export default router;
