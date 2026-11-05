import { useState, type ReactNode } from 'react';
import { CARDS, ESSENCE_INFO, MAX_RESERVED, MAX_TOKENS } from '../data';
import { paymentFor } from '../rules';
import { ESSENCES, TOKEN_COLORS, type AlchemyView, type Card, type PlayerView, type Tier, type TokenColor, type TokenCounts } from '../types';
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
  onBuy: (id: string) => void;
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
  const pay = me ? paymentFor(me, card) : null;
  return (
    <Modal title={card.name} onClose={onClose}>
      <div className="card-detail">
        <RecipeCard card={card} size="lg" bonus={me?.bonuses} affordable={!!pay} />
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
          {me && <CostTable card={card} me={me} />}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!canAct || !pay} onClick={() => onBuy(card.id)}>
          {pay ? '익히기' : '재료가 부족해요'}
        </button>
        {target.source === 'market' && (
          <button className="btn" disabled={!canAct || reserveFull} onClick={() => onReserve(card.id)}>
            {reserveFull ? '예약 칸이 가득 참' : `예약하기${catalystLeft ? ' (+촉매 1)' : ''}`}
          </button>
        )}
      </div>
      {!canAct && <p className="hint center">내 차례에만 할 수 있어요.</p>}
    </Modal>
  );
}

function CostTable({ card, me }: { card: Card; me: PlayerView }) {
  const rows = ESSENCES.filter((e) => card.cost[e] > 0);
  let catalystNeeded = 0;
  const lines = rows.map((e) => {
    const need = Math.max(0, card.cost[e] - me.bonuses[e]);
    const fromTokens = Math.min(need, me.tokens[e]);
    const short = need - fromTokens;
    catalystNeeded += short;
    return { e, cost: card.cost[e], bonus: Math.min(me.bonuses[e], card.cost[e]), fromTokens, short };
  });
  const catalystShort = Math.max(0, catalystNeeded - me.tokens.catalyst);
  return (
    <table className="cost-table">
      <thead>
        <tr>
          <th />
          <th>필요</th>
          <th>할인</th>
          <th>토큰</th>
          <th>부족</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.e}>
            <td>
              <span className={`text-ess ess-${l.e}`}>
                <EssenceIcon color={l.e} size={14} />
              </span>
            </td>
            <td>{l.cost}</td>
            <td>{l.bonus || '·'}</td>
            <td>{l.fromTokens || '·'}</td>
            <td className={l.short ? 'is-short' : ''}>{l.short || '·'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={5}>
            {catalystNeeded === 0
              ? '촉매 없이 살 수 있어요.'
              : catalystShort === 0
                ? `부족한 ${catalystNeeded}개는 촉매로 채워요.`
                : `촉매를 써도 ${catalystShort}개가 모자라요.`}
          </td>
        </tr>
      </tfoot>
    </table>
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
