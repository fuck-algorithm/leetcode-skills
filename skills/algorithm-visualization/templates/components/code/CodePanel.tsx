import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import { getSetting, setSetting } from '../../services/storage/indexedDbStore';
import type { AlgorithmStep, CodeArtifact, Language } from '../../types';

type Props = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  codeArtifacts: Record<Language, CodeArtifact>;
  step: AlgorithmStep;
};

const LANGUAGE_LABELS: Record<Language, string> = {
  java: 'Java',
  python: 'Python',
  go: 'Go',
  javascript: 'JavaScript'
};

const LANGUAGE_KEY = 'preferred-language';

const PRISM_LANGUAGE_MAP: Record<Language, string> = {
  java: 'java',
  python: 'python',
  go: 'go',
  javascript: 'javascript'
};

function resolveLines(step: AlgorithmStep, artifact: CodeArtifact): number[] {
  const merged = new Set<number>();
  for (const anchorId of step.binding.anchorIds) {
    const lines = artifact.anchorLineMap[anchorId] ?? [];
    for (const line of lines) {
      merged.add(line);
    }
  }
  return [...merged].sort((a, b) => a - b);
}

type PrismTokenLike = {
  type: string | string[];
  content: string | PrismTokenLike | PrismTokenLike[];
};

function renderPrismTokens(tokens: Array<string | PrismTokenLike>, keyPrefix: string): ReactNode[] {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (typeof token === 'string') {
      return token;
    }

    const className = `token ${Array.isArray(token.type) ? token.type.join(' ') : token.type}`;
    const content = Array.isArray(token.content)
      ? renderPrismTokens(token.content, key)
      : typeof token.content === 'string'
        ? token.content
        : renderPrismTokens([token.content], key);

    return (
      <span key={key} className={className}>
        {content}
      </span>
    );
  });
}

export function CodePanel({ language, onLanguageChange, codeArtifacts, step }: Props) {
  const artifact = codeArtifacts[language];
  const highlighted = resolveLines(step, artifact);

  const tokenizedLines = useMemo(() => {
    const prismLanguage = PRISM_LANGUAGE_MAP[language] ?? 'javascript';
    const grammar = Prism.languages[prismLanguage] ?? Prism.languages.javascript;
    return artifact.code.split('\n').map((line) => {
      const tokens = Prism.tokenize(line || ' ', grammar);
      return renderPrismTokens(tokens, `${prismLanguage}-${line}`);
    });
  }, [artifact.code, language]);

  useEffect(() => {
    void getSetting<Language>(LANGUAGE_KEY, language).then((saved) => {
      if (saved && codeArtifacts[saved]) {
        onLanguageChange(saved);
      }
    });
  }, [codeArtifacts, language, onLanguageChange]);

  function handleLanguageChange(next: Language) {
    onLanguageChange(next);
    void setSetting<Language>(LANGUAGE_KEY, next);
  }

  return (
    <div className="code-panel" data-testid="code-panel">
      <div className="code-toolbar">
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
          <button
            key={lang}
            type="button"
            data-testid={`language-${lang}`}
            className={language === lang ? 'lang-btn active' : 'lang-btn'}
            onClick={() => handleLanguageChange(lang)}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>

      <div className="code-content">
        {tokenizedLines.map((lineHtml, idx) => {
          const lineNo = idx + 1;
          const active = highlighted.includes(lineNo);
          return (
            <div
              key={lineNo}
              data-testid={`code-line-${lineNo}`}
              className={active ? 'code-line active' : 'code-line'}
            >
              <span className="line-no">{lineNo}</span>
              <span className="line-code">{lineHtml || ' '}</span>
            </div>
          );
        })}
      </div>

      <div className="variable-watch" data-testid="variable-watch">
        {Object.entries(step.binding.variables).map(([name, value]) => (
          <div key={name} className="var-row">
            <span>{name}</span>
            <span>{JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
