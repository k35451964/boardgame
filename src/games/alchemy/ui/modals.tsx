import { useState, type ReactNode } from 'react';
import { CARDS, ESSENCE_INFO, MAX_RESERVED, MAX_TOKENS } from '../data';
import { ESSENCES, TOKEN_COLORS, type AlchemyView, type Card, type Essence, type PlayerView, type Tier, type TokenColor, type TokenCounts } from '../types';
import { EssenceIcon } from './icons';
import { CardBack, PatronTile, RecipeCard, Token, tokenSum } from './parts';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export type CardTarget = { kind: 'card'; cardId: string; source: 'market' | 'reserve' } | { kind: 'deck'; tier: Tier };

export function CardModal({
  target,
  me,
  view,
  canAct,
  onBuy,
  onReserve,
  onReserveDeck,
  onClose,
}: {
  target: CardTarget;
  me: PlayerView | null;
  view: AlchemyView;
  canAct: boolean;
  onBuy: (id: string, payment?: Partial<TokenCounts>) => void;
  onReserve: (id: string) => void;
  onReserveDeck: (tier: Tier) => void;
  onClose: () => void;
}) {
  const reserveFull = !me || me.reserved.length >= MAX_RESERVED;
  const catalystLeft = view.bank.catalyst > 0;

  if (target.kind === 'deck') {
    const count = view.deckCounts[target.tier];
    return (
      <Modal title="덱에서 몰래 예약" onClose={onClose}>
        <div className="card-detail">
          <CardBack tier={target.tier} count={count} />
          <div className="card-detail-text">
            <p>덱 맨 위 레시피를 다른 사람 몰래 예약해요. 무엇이 나올지는 예약한 뒤에 알 수 있어요.</p>
            <p className="hint">{catalystLeft ? '예약하면 촉매를 1개 받아요.' : '촉매가 다 떨어져서 예약만 해요.'}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            disabled={!canAct || reserveFull || count === 0}
            onClick={() => onReserveDeck(target.tier)}
          >
            {reserveFull ? `예약 칸이 가득 찼어요 (${MAX_RESERVED}장)` : '몰래 예약하기'}
          </button>
        </div>
      </Modal>
    );
  }

  const card = CARDS[target.cardId];
  return (
    <BuyPanel
      key={card.id}
      card={card}
      me={me}
      canAct={canAct}
      source={target.source}
      reserveFull={reserveFull}
      catalystLeft={catalystLeft}
      onBuy={onBuy}
      onReserve={onReserve}
      onClose={onClose}
    />
  );
}

/** 낼 토큰 계산. extra = 색 토큰 대신 촉매로 낼 개수 */
function planPayment(card: Card, me: PlayerView, extra: Partial<Record<Essence, number>>) {
  let catalyst = 0;
  const lines = ESSENCES.filter((e) => card.cost[e] > 0).map((e) => {
    const need = Math.max(0, card.cost[e] - me.bonuses[e]);
    const tokens = Math.min(need, me.tokens[e]) - (extra[e] ?? 0);
    catalyst += need - tokens;
    return { e, cost: card.cost[e], bonus: Math.min(me.bonuses[e], card.cost[e]), tokens, catalyst: need - tokens };
  });
  const payment: Partial<TokenCounts> = { catalyst };
  for (const l of lines) payment[l.e] = l.tokens;
  return { lines, catalyst, affordable: catalyst <= me.tokens.catalyst, payment };
}

function BuyPanel({
  card,
  me,
  canAct,
  source,
  reserveFull,
  catalystLeft,
  onBuy,
  onReserve,
  onClose,
}: {
  card: Card;
  me: PlayerView | null;
  canAct: boolean;
  source: 'market' | 'reserve';
  reserveFull: boolean;
  catalystLeft: boolean;
  onBuy: (id: string, payment?: Partial<TokenCounts>) => void;
  onReserve: (id: string) => void;
  onClose: () => void;
}) {
  const [extra, setExtra] = useState<Partial<Record<Essence, number>>>({});
  const plan = me ? planPayment(card, me, extra) : null;
  const usingExtra = ESSENCES.some((e) => (extra[e] ?? 0) > 0);
  return (
    <Modal title={card.name} onClose={onClose}>
      <div className="card-detail">
        <RecipeCard card={card} size="lg" bonus={me?.bonuses} affordable={!!plan?.affordable} />
        <div className="card-detail-text">
          <p>
            익히면 <b className={`text-ess ess-${card.essence}`}>{ESSENCE_INFO[card.essence].name}</b> 할인 1개
            {card.points > 0 && (
              <>
                {' '}
                + <b>{card.points}점</b>
              </>
            )}
          </p>
          {me && plan && (
            <table className="cost-table">
              <thead>
                <tr>
                  <th />
                  <th>필요</th>
                  <th>할인</th>
                  <th>토큰</th>
                  <th>촉매</th>
                </tr>
              </thead>
              <tbody>
                {plan.lines.map((l) => {
                  const x = extra[l.e] ?? 0;
                  const canMore = me.tokens.catalyst > 0 && l.tokens > 0 && plan.catalyst < me.tokens.catalyst;
                  return (
                    <tr key={l.e}>
                      <td>
                        <span className={`text-ess ess-${l.e}`}>
                          <EssenceIcon color={l.e} size={14} />
                        </span>
                      </td>
                      <td>{l.cost}</td>
                      <td>{l.bonus || '·'}</td>
                      <td>{l.tokens || '·'}</td>
                      <td className={l.catalyst > 0 && !plan.affordable ? 'is-short' : ''}>
                        <span className="cat-cell">
                          {x > 0 && (
                            <button className="step" aria-label="촉매 덜 쓰기" onClick={() => setExtra({ ...extra, [l.e]: x - 1 })}>
                              −
                            </button>
                          )}
                          {l.catalyst || '·'}
                          {canMore && (
                            <button className="step" aria-label="색 토큰 대신 촉매 쓰기" onClick={() => setExtra({ ...extra, [l.e]: x + 1 })}>
                              +
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>
                    {plan.affordable
                      ? plan.catalyst === 0
                        ? '촉매 없이 살 수 있어요.'
                        : `촉매 ${plan.catalyst}개를 써요 (가진 촉매 ${me.tokens.catalyst}개).`
                      : `촉매를 써도 ${plan.catalyst - me.tokens.catalyst}개가 모자라요.`}
                    {me.tokens.catalyst > 0 && plan.affordable && <span className="hint"> 촉매 칸의 +로 색 토큰 대신 촉매를 낼 수 있어요.</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button
          className="btn btn-primary"
          disabled={!canAct || !plan?.affordable}
          onClick={() => onBuy(card.id, usingExtra ? plan!.payment : undefined)}
        >
          {plan?.affordable ? '익히기' : '재료가 부족해요'}
        </button>
        {source === 'market' && (
          <button className="btn" disabled={!canAct || reserveFull} onClick={() => onReserve(card.id)}>
            {reserveFull ? '예약 칸이 가득 참' : `예약하기${catalystLeft ? ' (+촉매 1)' : ''}`}
          </button>
        )}
      </div>
      {!canAct && <p className="hint center">내 차례에만 할 수 있어요.</p>}
    </Modal>
  );
}

export function DiscardModal({ me, onConfirm }: { me: PlayerView; onConfirm: (tokens: Partial<TokenCounts>) => void }) {
  const need = tokenSum(me.tokens) - MAX_TOKENS;
  const [ret, setRet] = useState<Partial<Record<TokenColor, number>>>({});
  const total = TOKEN_COLORS.reduce((s, c) => s + (ret[c] ?? 0), 0);
  return (
    <Modal title={`토큰 ${need}개를 반납하세요`}>
      <p className="hint">토큰은 최대 {MAX_TOKENS}개까지 가질 수 있어요. 누를 때마다 하나씩 반납 목록에 올라가요.</p>
      <div className="discard-grid">
        {TOKEN_COLORS.filter((c) => me.tokens[c] > 0).map((c) => {
          const r = ret[c] ?? 0;
          return (
            <div key={c} className="discard-cell">
              <Token
                color={c}
                count={me.tokens[c] - r}
                size="lg"
                disabled={r >= me.tokens[c] || total >= need}
                onClick={() => setRet({ ...ret, [c]: r + 1 })}
                label={`${ESSENCE_INFO[c].name} 반납`}
              />
              {r > 0 && (
                <button className="btn btn-ghost btn-small" onClick={() => setRet({ ...ret, [c]: r - 1 })}>
                  −{r} 취소
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={total !== need} onClick={() => onConfirm(ret)}>
          {total}/{need}개 반납하기
        </button>
      </div>
    </Modal>
  );
}

export function PatronModal({ choices, onChoose }: { choices: string[]; onChoose: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Modal title="후원자가 여럿 찾아왔어요!">
      <p className="hint">한 턴에 한 명만 모실 수 있어요. 고르지 않은 후원자는 나중에 다시 올 수도 있어요.</p>
      <div className="patron-choices">
        {choices.map((id) => (
          <PatronTile key={id} id={id} onClick={() => setSel(id)} selected={sel === id} />
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!sel} onClick={() => sel && onChoose(sel)}>
          모시기
        </button>
      </div>
    </Modal>
  );
}
