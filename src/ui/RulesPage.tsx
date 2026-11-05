import { CARD_LIST, MAX_RESERVED, MAX_TOKENS, PATRON_LIST, TAKE_TWO_MIN } from '../games/alchemy/data';
import { EssenceIcon } from '../games/alchemy/ui/icons';
import { ESSENCES } from '../games/alchemy/types';
import { ESSENCE_INFO } from '../games/alchemy/data';
import { navigate } from './router';

export function RulesPage() {
  return (
    <div className="rules">
      <header className="lobby-head">
        <button className="btn btn-ghost btn-small" onClick={() => navigate('/')}>
          ← 처음으로
        </button>
        <h1>생교 연금공방 규칙</h1>
        <span />
      </header>

      <section className="panel">
        <h2>한 줄 요약</h2>
        <p>
          정수 토큰을 모아 <b>레시피</b>를 익히세요. 익힌 레시피는 그 정수를 <b>영구히 1개 할인</b>해 줘서, 점점 더 비싼 레시피를
          쉽게 익힐 수 있어요. 목표 점수(기본 15점)에 먼저 닿는 연금술사가 나오면 그 라운드까지만 하고 끝나요.
        </p>
      </section>

      <section className="panel">
        <h2>정수 다섯 가지 + 촉매</h2>
        <ul className="rules-ess">
          {ESSENCES.map((e) => (
            <li key={e}>
              <span className={`token token-sm ess-${e}`}>
                <EssenceIcon color={e} size={13} />
              </span>
              {ESSENCE_INFO[e].name}
            </li>
          ))}
          <li>
            <span className="token token-sm ess-catalyst">
              <EssenceIcon color="catalyst" size={13} />
            </span>
            촉매 — 아무 정수 대신 쓸 수 있어요
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>내 차례에는 아래 중 하나만</h2>
        <ol className="rules-list">
          <li>
            <b>서로 다른 정수 3개</b> 가져오기 (남은 색이 적으면 1~2개도 가능)
          </li>
          <li>
            <b>같은 정수 2개</b> 가져오기 — 은행에 그 정수가 {TAKE_TWO_MIN}개 이상 남아 있을 때만
          </li>
          <li>
            레시피 <b>예약</b>하기 — 진열된 것 또는 덱 맨 위(몰래). 촉매 1개를 받아요. 최대 {MAX_RESERVED}장.
          </li>
          <li>
            레시피 <b>익히기</b> — 진열된 것 또는 내가 예약한 것. 할인을 먼저 적용하고 남은 만큼 토큰을 내요. 모자라면 촉매로
            채워요.
          </li>
        </ol>
        <p className="hint">
          토큰은 최대 {MAX_TOKENS}개까지 가질 수 있어요. 넘으면 차례 끝에 넘친 만큼 반납해요.
        </p>
      </section>

      <section className="panel">
        <h2>후원자</h2>
        <p>
          후원자 타일에 적힌 만큼 레시피(할인)를 모으면 차례 끝에 후원자가 자동으로 찾아와요 (+3점). 한 턴에 한 명만 오고, 여럿이
          동시에 오면 하나를 골라요. 후원자는 모두 {PATRON_LIST.length}명이고, 판마다 인원수+1명이 나와요.
        </p>
      </section>

      <section className="panel">
        <h2>게임 끝</h2>
        <p>
          누군가 목표 점수에 닿으면 마지막 라운드가 시작돼요. 선 플레이어 직전 사람까지 하고 끝나서, 모두 같은 횟수만큼 둬요. 점수가
          가장 높은 사람이 이기고, 동점이면 레시피를 <b>적게</b> 익힌 사람이 이겨요.
        </p>
      </section>

      <section className="panel">
        <h2>카드 구성</h2>
        <p>
          기초 조제 {CARD_LIST.filter((c) => c.tier === 1).length}장 · 숙련 조제 {CARD_LIST.filter((c) => c.tier === 2).length}장 · 대연성{' '}
          {CARD_LIST.filter((c) => c.tier === 3).length}장. 단계마다 4장씩 진열돼요.
        </p>
      </section>

      <button className="btn btn-primary btn-wide" onClick={() => navigate('/')}>
        처음으로
      </button>
    </div>
  );
}
