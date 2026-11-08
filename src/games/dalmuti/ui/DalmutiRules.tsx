import { navigate } from '../../../ui/router';
import { JOKER, RANKS } from '../data';
import { CardFace } from './CardFace';

export function DalmutiRulesPage() {
  return (
    <div className="rules">
      <header className="lobby-head">
        <button className="btn btn-ghost btn-small" onClick={() => navigate('/')}>
          ← 처음으로
        </button>
        <h1>생무티 규칙</h1>
        <span />
      </header>

      <section className="panel">
        <h2>한 줄 요약</h2>
        <p>
          손에 든 카드를 <b>가장 먼저 다 내는 사람</b>이 다음 판의 대왕! 꼴찌는 다음 판에 가장 좋은 카드를 바쳐야 해요.
        </p>
      </section>

      <section className="panel">
        <h2>카드 80장</h2>
        <p>숫자가 작을수록 강하고, 숫자만큼 장수가 있어요 (1번은 1장, 12번은 12장).</p>
        <div className="gallery-row dal-rule-cards">
          {RANKS.map((r) => (
            <CardFace key={r.rank} rank={r.rank} size="sm" />
          ))}
          <CardFace rank={13} size="sm" />
        </div>
        <p className="hint">
          {JOKER.emoji} {JOKER.name}(어릿광대) 2장은 아무 숫자로나 쓸 수 있어요. 어릿광대만 내면 13 (가장 약함).
        </p>
      </section>

      <section className="panel">
        <h2>내 차례에는</h2>
        <ol className="rules-list">
          <li>
            <b>선</b>이면 같은 숫자 카드를 원하는 장수만큼 내요. (예: 기린 3장)
          </li>
          <li>
            그다음 사람들은 <b>같은 장수</b>로 <b>더 작은 숫자</b>를 내거나 <b>패스</b>해요. 패스해도 다음 바퀴에 다시 낼 수 있어요.
          </li>
          <li>모두 패스하면 마지막에 낸 사람이 새로 선이 돼요.</li>
          <li>손패를 다 낸 순서대로 등수가 정해지고, 한 명만 남으면 판이 끝나요.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>다음 판: 자리와 세금</h2>
        <ul className="rules-list">
          <li>등수대로 앉아요: 대왕 · 귀족 · 평민 … · 하인 · 노비</li>
          <li>노비는 가장 좋은 카드 2장을 대왕에게, 하인은 1장을 귀족에게 바쳐요.</li>
          <li>대왕과 귀족은 받은 만큼 아무 카드나 골라 돌려줘요.</li>
          <li>
            어릿광대 2장을 한 사람이 다 받으면 <b>혁명</b>을 선언할 수 있어요: 그 판은 세금이 없어요. 노비가 선언하면{' '}
            <b>대혁명</b>! 등수가 통째로 뒤집혀요.
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>점수</h2>
        <p>판마다 1등은 (인원수−1)점, 그다음은 1점씩 적게, 꼴찌는 0점. 누적 점수로 겨뤄요.</p>
      </section>

      <button className="btn btn-primary btn-wide" onClick={() => navigate('/')}>
        처음으로
      </button>
    </div>
  );
}
