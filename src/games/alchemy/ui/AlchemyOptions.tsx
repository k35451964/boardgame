import type { OptionsProps } from '../../registry';
import { TARGET_SCORE_CHOICES } from '../rules';
import type { AlchemyOptions } from '../types';

export function AlchemyOptionsEditor({ options, editable, onChange }: OptionsProps) {
  const o = options as AlchemyOptions;
  return (
    <div className="options">
      <p className="options-label">목표 점수</p>
      <div className="segmented" role="radiogroup" aria-label="목표 점수">
        {TARGET_SCORE_CHOICES.map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={o.targetScore === n}
            className={o.targetScore === n ? 'is-on' : ''}
            disabled={!editable}
            onClick={() => onChange({ ...o, targetScore: n })}
          >
            {n}점{n === 15 ? ' (기본)' : n < 15 ? ' (짧게)' : ' (길게)'}
          </button>
        ))}
      </div>
      <p className="hint">누군가 목표 점수에 닿으면 그 라운드까지만 하고 끝나요.</p>
    </div>
  );
}
