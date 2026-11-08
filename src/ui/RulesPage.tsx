import { CARD_LIST, MAX_RESERVED, MAX_TOKENS, TAKE_TWO_MIN } from '../games/alchemy/data';
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
        <h1>생플렌더 규칙</h1>
        <span />
      </header>

      <section className="panel">
        <h2>한 줄 요약</h2>
        <p>
          토큰을 모아 <b>생물 카드</b>를 도감에 등록하세요. 등록한 카드는 그 분야를 <b>영구히 1개 할인</b>해 줘서, 흔한 종에서
          보호종, 멸종위기종으로 점점 더 비싼 카드를 쉽게 등록할 수 있어요. 누군가 15점에 닿으면 그 라운드까지만 하고 끝나요.
        </p>
      </section>

      <section className="panel">
        <h2>토큰 다섯 가지 + 생교</h2>
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
            <span className="token token-sm ess-joker">
              <EssenceIcon color="joker" size={13} />
            </span>
            생물교육과(생교) — 아무 토큰 대신 쓸 수 있는 조커예요
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>내 차례에는 아래 중 하나만</h2>
        <ol className="rules-list">
          <li>
            <b>서로 다른 토큰 3개</b> 가져오기 (은행에 남은 색이 3가지 미만이면 남은 색을 모두)
          </li>
          <li>
            <b>같은 토큰 2개</b> 가져오기 — 은행에 그 토큰이 {TAKE_TWO_MIN}개 이상 남아 있을 때만
          </li>
          <li>
            카드 <b>예약</b>하기 — 진열된 것 또는 덱 맨 위(몰래). 생교 1개를 받아요. 최대 {MAX_RESERVED}장.
          </li>
          <li>
            카드 <b>등록하기</b> — 진열된 것 또는 내가 예약한 것. 할인을 먼저 적용하고 남은 만큼 토큰을 내요. 모자라면 생교로
            채우고, 원하면 색 토큰 대신 생교를 낼 수도 있어요.
          </li>
        </ol>
        <p className="hint">
          토큰은 최대 {MAX_TOKENS}개까지 가질 수 있어요. 넘으면 차례 끝에 넘친 만큼 반납해요. 토큰은 2인 4개 · 3인
          5개 · 4인 7개씩, 생교는 5개로 시작해요.
        </p>
      </section>

      <section className="panel">
        <h2>쌤</h2>
        <p>
          쌤 타일에 적힌 만큼 카드(할인)를 모으면 차례 끝에 쌤이 나를 눈여겨봐요 (+3점). 한 턴에 한 명만 오고, 여럿이 동시에 오면
          하나를 골라요. 쌤은 채쌤 · 양쌤 · 김쌤 · 장쌤 · 황쌤 5명이고, 판마다 인원수+1명이 나와요. 같은 쌤이 한 판에 두 번 나오지는
          않고, 같은 쌤이라도 판마다 원하는 조건이 다를 수 있어요.
        </p>
      </section>

      <section className="panel">
        <h2>게임 끝</h2>
        <p>
          누군가 15점에 닿으면 마지막 라운드가 시작돼요. 선 플레이어 직전 사람까지 하고 끝나서, 모두 같은 횟수만큼 둬요. 점수가
          가장 높은 사람이 이기고, 동점이면 카드를 <b>적게</b> 등록한 사람이 이겨요.
        </p>
      </section>

      <section className="panel">
        <h2>카드 구성</h2>
        <p>
          기초 조제 {CARD_LIST.filter((c) => c.tier === 1).length}장 · 숙련 조제 {CARD_LIST.filter((c) => c.tier === 2).length}장 · 대연성{' '}
          {CARD_LIST.filter((c) => c.tier === 3).length}장. 단계마다 4장씩 진열돼요.
        </p>
      </section>

      <button className="btn btn-wide" onClick={() => navigate('/cards')}>
        카드 도감 보기 (90장)
      </button>
      <button className="btn btn-primary btn-wide" onClick={() => navigate('/')}>
        처음으로
      </button>
    </div>
  );
}
