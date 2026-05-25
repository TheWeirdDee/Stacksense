import axios from 'axios';
const NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads';

export async function getNpmDownloads(packageName) {
    try {
        const [monthlyRes, weeklyRes, rangeRes] = await Promise.all([
            axios.get(`${NPM_DOWNLOADS_API}/point/last-month/${packageName}`, { timeout: 6000 }),
            axios.get(`${NPM_DOWNLOADS_API}/point/last-week/${packageName}`, { timeout: 6000 }),
            axios.get(`${NPM_DOWNLOADS_API}/range/last-month/${packageName}`, { timeout: 6000 }),
        ]);
        const dailyBreakdown = (rangeRes.data?.downloads || []).map((d) => ({
            day: d.day,
            downloads: d.downloads,
        }));
        const monthlyDownloads = monthlyRes.data?.downloads || 0;
        const weeklyDownloads = weeklyRes.data?.downloads || 0;
        const avg = dailyBreakdown.length > 0
            ? Math.round(dailyBreakdown.reduce((s, d) => s + d.downloads, 0) / dailyBreakdown.length)
            : 0;
        const peak = dailyBreakdown.length > 0
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
    }
    catch (err) {
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
