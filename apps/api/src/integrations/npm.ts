import axios from 'axios';

const NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads';

export interface NpmDailyDownload {
  day: string;
  downloads: number;
}

export interface NpmDownloadStats {
  package: string;
  monthlyDownloads: number;
  weeklyDownloads: number;
  dailyBreakdown: NpmDailyDownload[];
  averageDailyDownloads: number;
  peakDailyDownloads: number;
}

/**
 * Fetch monthly download stats for an NPM package.
 * Uses the public npm downloads API — no auth required.
 */
export async function getNpmDownloads(packageName: string): Promise<NpmDownloadStats> {
  try {
    const [monthlyRes, weeklyRes, rangeRes] = await Promise.all([
      axios.get(`${NPM_DOWNLOADS_API}/point/last-month/${packageName}`, { timeout: 6000 }),
      axios.get(`${NPM_DOWNLOADS_API}/point/last-week/${packageName}`, { timeout: 6000 }),
      axios.get(`${NPM_DOWNLOADS_API}/range/last-month/${packageName}`, { timeout: 6000 }),
    ]);

    const dailyBreakdown: NpmDailyDownload[] = (rangeRes.data?.downloads || []).map(
      (d: { day: string; downloads: number }) => ({
        day: d.day,
        downloads: d.downloads,
      })
    );

    const monthlyDownloads = monthlyRes.data?.downloads || 0;
    const weeklyDownloads = weeklyRes.data?.downloads || 0;
    const avg =
      dailyBreakdown.length > 0
        ? Math.round(dailyBreakdown.reduce((s, d) => s + d.downloads, 0) / dailyBreakdown.length)
        : 0;
    const peak =
      dailyBreakdown.length > 0
        ? Math.max(...dailyBreakdown.map((d) => d.downloads))
        : 0;

    return {
      package: packageName,
      monthlyDownloads,
      weeklyDownloads,
      dailyBreakdown,
      averageDailyDownloads: avg,
      peakDailyDownloads: peak,
    };
  } catch (err: any) {
    console.error(`[NPM] Failed to fetch downloads for ${packageName}:`, err.message);
    return {
      package: packageName,
      monthlyDownloads: 0,
      weeklyDownloads: 0,
      dailyBreakdown: [],
      averageDailyDownloads: 0,
      peakDailyDownloads: 0,
    };
  }
}
