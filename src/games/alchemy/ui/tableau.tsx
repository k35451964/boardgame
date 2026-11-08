import { CARDS, ESSENCE_INFO, MAX_TOKENS } from '../data';
import { ESSENCES, TOKEN_COLORS, type PlayerView } from '../types';
import { EssenceIcon } from './icons';
import { RecipeCard, Token, tokenSum } from './parts';

/** 내 자리: 테이블에 카드를 색깔별로 겹쳐 놓은 것처럼 보여 준다 */
export function MyTableau({ player }: { player: PlayerView }) {
  const total = tokenSum(player.tokens);
  return (
    <div className="tableau">
      <div className="tab-section">
        <p className="tab-label">
          토큰 <b className={total >= MAX_TOKENS ? 'warn' : ''}>{total}</b>/{MAX_TOKENS}
        </p>
        <div className="tab-tokens">
          {TOKEN_COLORS.map((c) => (
            <Token key={c} color={c} count={player.tokens[c]} />
          ))}
        </div>
      </div>

      <div className="tab-section">
        <p className="tab-label">
          등록한 카드 <b>{player.cards.length}</b>장
        </p>
        <div className="tab-rows">
          {ESSENCES.map((e) => {
            const cards = player.cards
              .map((id) => CARDS[id])
              .filter((c) => c.essence === e)
              .sort((a, b) => a.tier - b.tier || a.points - b.points);
            const pts = cards.reduce((s, c) => s + c.points, 0);
            return (
              <div key={e} className={`tab-row ess-${e} ${cards.length ? '' : 'is-empty'}`}>
                <span className="tab-bonus" title={`${ESSENCE_INFO[e].name} 할인 ${cards.length}`}>
                  <EssenceIcon color={e} size={14} />
                  {cards.length}
                </span>
                <div className="tab-stack">
                  {cards.length === 0 ? (
                    <span className="tab-none">{ESSENCE_INFO[e].name} 없음</span>
                  ) : (
                    cards.map((c) => <RecipeCard key={c.id} card={c} size="xs" />)
                  )}
                </div>
                {pts > 0 && <span className="tab-pts">{pts}점</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
