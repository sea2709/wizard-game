export type LifetimeStats = {
    gamesStarted: number;
    gamesWon: number;
    starlightsCollected: number;
    murklingsDefeated: number;
};

export type RunStats = {
    starlightsCollected: number;
    murklingsDefeated: number;
};

const STORAGE_KEY = 'starwarden-lifetime-stats';
const STORAGE_VERSION = 1;

type StoredStats = LifetimeStats & {
    version: number;
};

const DEFAULT_LIFETIME: LifetimeStats = {
    gamesStarted: 0,
    gamesWon: 0,
    starlightsCollected: 0,
    murklingsDefeated: 0
};

function isValidLifetimeStats (value: unknown): value is LifetimeStats
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const stats = value as Record<string, unknown>;

    return (
        typeof stats.gamesStarted === 'number'
        && typeof stats.gamesWon === 'number'
        && typeof stats.starlightsCollected === 'number'
        && typeof stats.murklingsDefeated === 'number'
        && stats.gamesStarted >= 0
        && stats.gamesWon >= 0
        && stats.starlightsCollected >= 0
        && stats.murklingsDefeated >= 0
    );
}

export function loadLifetimeStats (): LifetimeStats
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw)
        {
            return { ...DEFAULT_LIFETIME };
        }

        const parsed = JSON.parse(raw) as StoredStats;

        if (parsed.version !== STORAGE_VERSION || !isValidLifetimeStats(parsed))
        {
            return { ...DEFAULT_LIFETIME };
        }

        return {
            gamesStarted: parsed.gamesStarted,
            gamesWon: parsed.gamesWon,
            starlightsCollected: parsed.starlightsCollected,
            murklingsDefeated: parsed.murklingsDefeated
        };
    }
    catch
    {
        return { ...DEFAULT_LIFETIME };
    }
}

export function saveLifetimeStats (stats: LifetimeStats): void
{
    try
    {
        const payload: StoredStats = {
            version: STORAGE_VERSION,
            ...stats
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
    catch
    {
        // Ignore quota / private browsing errors.
    }
}

export function recordGameStarted (): LifetimeStats
{
    const stats = loadLifetimeStats();

    stats.gamesStarted++;
    saveLifetimeStats(stats);

    return stats;
}

export function recordVictory (run: RunStats): { lifetime: LifetimeStats; run: RunStats }
{
    const lifetime = loadLifetimeStats();

    lifetime.gamesWon++;
    lifetime.starlightsCollected += run.starlightsCollected;
    lifetime.murklingsDefeated += run.murklingsDefeated;
    saveLifetimeStats(lifetime);

    return { lifetime, run };
}
