import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodePanel } from '../../../../components/code/CodePanel';
import type { AlgorithmStep, CodeArtifact, Language } from '../../../../types';

vi.mock('../../../../services/storage/indexedDbStore', () => ({
  getSetting: vi.fn(async (_key: string, fallback: Language) => fallback),
  setSetting: vi.fn(async () => undefined)
}));

const step: AlgorithmStep = {
  id: 0,
  title: '初始化',
  description: '初始化指针',
  binding: {
    anchorIds: ['init'],
    variables: { i: 0, target: 9 }
  },
  frame: { nodes: [], edges: [], arrows: [], labels: [], notes: [] }
};

function artifact(language: Language, code: string): CodeArtifact {
  return {
    language,
    code,
    anchorLineMap: { init: [1] }
  };
}

const codeArtifacts: Record<Language, CodeArtifact> = {
  java: artifact('java', 'int i = 0;\nint j = 1;'),
  python: artifact('python', 'i = 0\nj = 1'),
  go: artifact('go', 'i := 0\nj := 1'),
  javascript: artifact('javascript', 'let i = 0;\nlet j = 1;')
};

describe('CodePanel', () => {
  it('renders line numbers and highlights lines bound to the current step', () => {
    render(
      <CodePanel language="java" onLanguageChange={() => undefined} codeArtifacts={codeArtifacts} step={step} />
    );

    expect(screen.getByTestId('code-line-1').className).toContain('active');
    expect(screen.getByTestId('code-line-2').className).not.toContain('active');
    expect(screen.getByTestId('variable-watch').textContent).toContain('target');
  });

  it('notifies the parent when switching languages', () => {
    const onLanguageChange = vi.fn();
    render(
      <CodePanel
        language="java"
        onLanguageChange={onLanguageChange}
        codeArtifacts={codeArtifacts}
        step={step}
      />
    );

    fireEvent.click(screen.getByTestId('language-python'));

    expect(onLanguageChange).toHaveBeenCalledWith('python');
  });
});
