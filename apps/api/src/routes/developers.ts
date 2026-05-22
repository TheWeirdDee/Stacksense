import express from 'express';
import { registerDeveloper, getDeveloperStats, trackGitHubActivity } from '../integrations/github.js';

const router = express.Router();

// Register GitHub account to Stacks address
router.post('/register', async (req, res) => {
  try {
    const { username, stacksAddress } = req.body;

    if (!username || !stacksAddress) {
      return res.status(400).json({ error: 'username and stacksAddress are required' });
    }

    const result = await registerDeveloper(username, stacksAddress);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to register developer' });
  }
});

// Get developer statistics
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

// Manually sync GitHub activity
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
