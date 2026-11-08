import type { OptionsProps } from '../../registry';
import { TARGET_SCORE } from '../rules';

export function AlchemyOptionsEditor(_props: OptionsProps) {
  return (
    <div className="options">
      <p className="options-label">목표 점수 {TARGET_SCORE}점</p>
      <p className="hint">누군가 {TARGET_SCORE}점에 닿으면 그 라운드까지만 하고 끝나요.</p>
    </div>
  );
}
