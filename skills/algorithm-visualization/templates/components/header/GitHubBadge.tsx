import { useEffect, useMemo, useState } from 'react';
import { getCached, getCachedEvenExpired, setCached } from '../../services/storage/indexedDbStore';

type Props = {
  repoUrl: string;
};

const STAR_TTL_SECONDS = 3600;

function parseRepo(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2] };
}

export function GitHubBadge({ repoUrl }: Props) {
  const [stars, setStars] = useState<number>(0);
  const repo = useMemo(() => parseRepo(repoUrl), [repoUrl]);

  useEffect(() => {
    if (!repo) {
      setStars(0);
      return;
    }

    const key = `github-stars:${repo.owner}/${repo.repo}`;

    void (async () => {
      const fresh = await getCached<number>(key);
      if (typeof fresh === 'number') {
        setStars(fresh);
        return;
      }

      try {
        const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`);
        if (!response.ok) {
          throw new Error('GitHub API request failed');
        }
        const payload = (await response.json()) as { stargazers_count?: number };
        const next = payload.stargazers_count ?? 0;
        setStars(next);
        await setCached<number>(key, next, STAR_TTL_SECONDS);
      } catch {
        const fallback = await getCachedEvenExpired<number>(key);
        setStars(typeof fallback === 'number' ? fallback : 0);
      }
    })();
  }, [repo]);

  return (
    <a
      className="github-badge"
      data-testid="github-badge"
      href={repoUrl}
      target="_blank"
      rel="noreferrer"
      title="去 GitHub 仓库 Star 支持一下"
    >
      <span aria-hidden>GitHub</span>
      <span className="github-stars" data-testid="github-stars">⭐ {stars}</span>
    </a>
  );
}
