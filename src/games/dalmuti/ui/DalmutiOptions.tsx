import type { OptionsProps } from '../../registry';
import { JOKER, RANKS } from '../data';

export function DalmutiOptions(_props: OptionsProps) {
  return (
    <div className="options">
      <p className="options-label">카드 80장 · 4~8명</p>
      <div className="dal-mini-deck">
        {RANKS.map((r) => (
          <span key={r.rank} title={`${r.name} ${r.rank}장`}>
            {r.emoji}
            <small>{r.rank}</small>
          </span>
        ))}
        <span title={`${JOKER.name} 2장`}>
          {JOKER.emoji}
          <small>★</small>
        </span>
      </div>
      <p className="hint">숫자가 작을수록 강하고, 숫자만큼 장수가 있어요. 판이 끝날 때마다 누적 점수가 쌓여요.</p>
    </div>
  );
}
