import { useState } from 'react';
import type { InputSample, InputValidationResult, ProblemData } from '../../types';

type Props = {
  samples: InputSample[];
  validator: (raw: string) => InputValidationResult;
  randomGenerator: () => string;
  onChange: (data: ProblemData) => void;
};

export function DataInputBar({ samples, validator, randomGenerator, onChange }: Props) {
  const [raw, setRaw] = useState(samples[0]?.value ?? '');
  const [error, setError] = useState<string>('');

  function handleCommit(nextRaw: string) {
    setRaw(nextRaw);
    const result = validator(nextRaw);
    if (!result.valid) {
      setError(result.error ?? '输入不合法');
      return;
    }
    setError('');
    onChange({
      raw: nextRaw,
      parsed: result.parsed
    });
  }

  return (
    <section className="data-input-bar" data-testid="data-input-bar">
      <label className="input-label" htmlFor="algo-input">
        输入数据
      </label>
      <input
        id="algo-input"
        data-testid="algo-input"
        className={error ? 'data-input error' : 'data-input'}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        onBlur={() => handleCommit(raw)}
        placeholder='例如: [1,2,3] 或 {"root":[1,2,3]}'
      />
      {samples.map((sample) => (
        <button
          key={sample.id}
          type="button"
          data-testid={`sample-${sample.id}`}
          className="input-action-btn"
          onClick={() => handleCommit(sample.value)}
        >
          {sample.label}
        </button>
      ))}
      <button
        type="button"
        data-testid="random-input-btn"
        className="input-random-btn"
        onClick={() => handleCommit(randomGenerator())}
      >
        随机合法数据
      </button>
      {error ? <span className="input-error" data-testid="input-error">{error}</span> : null}
    </section>
  );
}
