import { useMemo, useState } from 'react';
import { ProblemHeader } from './components/header/ProblemHeader';
import { GitHubBadge } from './components/header/GitHubBadge';
import { AlgorithmThoughtModal } from './components/overlay/AlgorithmThoughtModal';
import { DataInputBar } from './components/input/DataInputBar';
import { VisualizationCanvas } from './components/canvas/VisualizationCanvas';
import { CodePanel } from './components/code/CodePanel';
import { PlaybackControls } from './components/controls/PlaybackControls';
import { CommunityFloat } from './components/overlay/CommunityFloat';
import { usePlayback } from './features/playback/usePlayback';
import { createSolutionRegistry } from './features/solutions/solutionRegistry';
import type { Language, ProblemConfig, ProblemData, SolutionDefinition } from './types';

/**
 * 注意:
 * 1) App 仅做页面编排，不做重逻辑
 * 2) 具体算法动画、代码映射、输入校验都应在 feature/component 层实现
 * 3) 题目有多种解法时，每种解法必须有独立 SolutionDefinition（独立步骤与画布渲染）
 */
const PROBLEM_CONFIG: ProblemConfig = {
  number: Number('{题号}'),
  title: '{中文标题}',
  slug: '{slug}',
  leetcodeUrl: 'https://leetcode.cn/problems/{slug}/',
  hot100Url: 'https://fuck-algorithm.github.io/leetcode-hot-100/',
  githubRepoUrl: '{github_repo}'
};

const DEFAULT_LANGUAGE: Language = 'java';

function App() {
  const [inputData, setInputData] = useState<ProblemData | null>(null);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isThoughtOpen, setThoughtOpen] = useState(false);

  const solutions = useMemo(() => createSolutionRegistry(), []);
  const [activeSolutionId, setActiveSolutionId] = useState<string>(solutions[0]?.id ?? '');

  const activeSolution: SolutionDefinition | undefined = useMemo(
    () => solutions.find((s) => s.id === activeSolutionId),
    [activeSolutionId, solutions]
  );

  const playback = usePlayback({
    totalSteps: activeSolution?.steps.length ?? 0,
    initialSpeed: 1
  });

  if (!activeSolution) {
    return <div className="app-empty">未找到可用解法配置</div>;
  }

  return (
    <div className="app-root" data-testid="app-root">
      <ProblemHeader config={PROBLEM_CONFIG} />

      <div className="top-actions" data-testid="top-actions">
        <button
          className="thought-btn"
          data-testid="thought-btn"
          type="button"
          onClick={() => setThoughtOpen(true)}
        >
          算法思路
        </button>
        <GitHubBadge repoUrl={PROBLEM_CONFIG.githubRepoUrl} />
      </div>

      <AlgorithmThoughtModal
        open={isThoughtOpen}
        title={activeSolution.name}
        content={activeSolution.thought}
        onClose={() => setThoughtOpen(false)}
      />

      <DataInputBar
        samples={activeSolution.samples}
        validator={activeSolution.validateInput}
        randomGenerator={activeSolution.generateRandom}
        onChange={(data) => {
          setInputData(data);
          playback.reset();
        }}
      />

      <div className="solution-tabs" data-testid="solution-tabs">
        {solutions.map((solution) => (
          <button
            key={solution.id}
            data-testid={`solution-tab-${solution.id}`}
            className={solution.id === activeSolutionId ? 'tab-btn active' : 'tab-btn'}
            type="button"
            onClick={() => {
              setActiveSolutionId(solution.id);
              playback.reset();
            }}
          >
            {solution.name}
          </button>
        ))}
      </div>

      <main className="workspace">
        <section className="canvas-section">
          <VisualizationCanvas
            data={inputData}
            step={activeSolution.steps[playback.currentStep]}
            solution={activeSolution}
          />
        </section>

        <aside className="code-section">
          <CodePanel
            language={language}
            onLanguageChange={setLanguage}
            codeArtifacts={activeSolution.codes}
            step={activeSolution.steps[playback.currentStep]}
          />
        </aside>
      </main>

      <PlaybackControls
        currentStep={playback.currentStep}
        totalSteps={activeSolution.steps.length}
        isPlaying={playback.isPlaying}
        speed={playback.speed}
        onPrev={playback.prev}
        onNext={playback.next}
        onPlayPause={playback.togglePlay}
        onReset={playback.reset}
        onSpeedChange={playback.setSpeed}
        onSeek={playback.seek}
      />

      <CommunityFloat />
    </div>
  );
}

export default App;
