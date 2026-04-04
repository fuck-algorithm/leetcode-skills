import type { ProblemConfig } from '../../types';

type Props = {
  config: ProblemConfig;
};

export function ProblemHeader({ config }: Props) {
  return (
    <header className="problem-header" data-testid="problem-header">
      <a
        className="hot100-link"
        data-testid="hot100-link"
        href={config.hot100Url}
        target="_blank"
        rel="noreferrer"
      >
        返回 LeetCode Hot 100
      </a>

      <a
        className="problem-title-link"
        data-testid="problem-title-link"
        href={config.leetcodeUrl}
        target="_blank"
        rel="noreferrer"
      >
        LeetCode {config.number}. {config.title}
      </a>
    </header>
  );
}
