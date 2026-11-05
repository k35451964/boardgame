import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatBox } from '../../../ui/ChatBox';
import { navigate } from '../../../ui/router';
import type { BoardProps } from '../../registry';
import { CARDS, ESSENCE_INFO, MAX_RESERVED, MAX_TOKENS, TAKE_TWO_MIN } from '../data';
import { paymentFor } from '../rules';
import { ESSENCES, TIERS, type AlchemyAction, type AlchemyView, type Essence, type Tier } from '../types';
import { describeLog } from './format';
import { CardModal, DiscardModal, PatronModal, type CardTarget } from './modals';
import { CardBack, Holdings, PatronTile, PlayerPanel, RecipeCard, Token, tokenSum } from './parts';
import { useTurnAlert } from './useTurnAlert';

function takeProblem(view: AlchemyView, sel: Essence[]): string | null {
  if (sel.length === 0) return '정수를 골라 주세요.';
  if (sel.length === 2 && sel[0] === sel[1]) {
    return view.bank[sel[0]] >= TAKE_TWO_MIN ? null : `같은 정수 2개는 은행에 ${TAKE_TWO_MIN}개 이상 있을 때만 돼요.`;
  }
  return null;
}

export function AlchemyBoard({ snapshot, client }: BoardProps) {
  const view = snapshot.view as AlchemyView;
  const myId = snapshot.myId;
  const me = view.players.find((p) => p.id === myId) ?? null;
  const active = view.players[view.turn];
  const isMyTurn = !!me && active.id === me.id && view.phase !== 'ended';
  const seatOf = (id: string) => snapshot.seats.find((s) => s.id === id);
  const nameOf = (id: string) => seatOf(id)?.name ?? '?';

  const [selection, setSelection] = useState<Essence[]>([]);
  const [target, setTarget] = useState<CardTarget | null>(null);
  const [sideTab, setSideTab] = useState<'log' | 'chat'>('log');
  const [showResult, setShowResult] = useState(true);
  const [seenChat, setSeenChat] = useState(snapshot.chat.length);

  useTurnAlert(isMyTurn && view.phase === 'action');

  // 상태가 바뀌면 고르던 것을 초기화
  const lastVersion = useRef(snapshot.version);
  useEffect(() => {
    if (lastVersion.current !== snapshot.version) {
      lastVersion.current = snapshot.version;
      setSelection([]);
      setTarget((t) => {
        if (!t || t.kind === 'deck') return null;
        // 보고 있던 카드가 아직 있으면 유지
        const stillThere =
          TIERS.some((tier) => view.market[tier].includes(t.cardId)) || me?.reserved.some((r) => r.cardId === t.cardId);
        return stillThere && !isMyTurn ? t : null;
      });
    }
  }, [snapshot.version, view.market, me, isMyTurn]);

  useEffect(() => {
    if (sideTab === 'chat') setSeenChat(snapshot.chat.length);
  }, [sideTab, snapshot.chat.length]);

  const act = (action: AlchemyAction) => client.act(action);

  const clickBank = (e: Essence) => {
    if (!isMyTurn || view.phase !== 'action') return;
    const count = selection.filter((x) => x === e).length;
    if (count === 2) return setSelection([]);
    if (count === 1) {
      if (selection.length === 1 && view.bank[e] >= TAKE_TWO_MIN) return setSelection([e, e]);
      return setSelection(selection.filter((x) => x !== e));
    }
    if (view.bank[e] <= 0) return;
    if (selection.length === 2 && selection[0] === selection[1]) return setSelection([e]);
    if (selection.length >= 3) return;
    setSelection([...selection, e]);
  };

  const problem = takeProblem(view, selection);
  const overflow = me ? tokenSum(me.tokens) + selection.length - MAX_TOKENS : 0;

  const hasAnyMove = useMemo(() => {
    if (!me) return false;
    if (ESSENCES.some((e) => view.bank[e] > 0)) return true;
    if (me.reserved.length < MAX_RESERVED && TIERS.some((t) => view.deckCounts[t] > 0 || view.market[t].some(Boolean))) return true;
    const affordable = (id: string | null) => !!id && !!paymentFor(me, CARDS[id]);
    return TIERS.some((t) => view.market[t].some(affordable)) || me.reserved.some((r) => affordable(r.cardId));
  }, [me, view]);

  const lastEntry = [...view.log].reverse().find((e) => e.kind !== 'end');
  const others = view.players.filter((p) => p.id !== myId);
  const unreadChat = snapshot.chat.length - seenChat;
  const ended = view.phase === 'ended';
  const activeSeat = seatOf(active.id);
  const absent = !ended && !!me && !!client.substitute && !!activeSeat && !activeSeat.bot && !activeSeat.connected;

  let status: string;
  if (ended) status = '게임이 끝났어요';
  else if (isMyTurn) {
    status =
      view.phase === 'discard'
        ? '토큰을 반납하세요'
        : view.phase === 'patron'
          ? '후원자를 고르세요'
          : '내 차례예요!';
  } else status = `${nameOf(active.id)} 님 차례`;

  return (
    <div className={`alc ${isMyTurn ? 'my-turn' : ''}`}>
      <header className="alc-top">
        <button
          className="btn btn-ghost btn-small"
          onClick={() => {
            if (ended || confirm('게임에서 나갈까요? 같은 링크로 다시 들어올 수 있어요.')) navigate('/');
          }}
        >
          ← 나가기
        </button>
        <div className="alc-title">
          <span>
            {view.round}라운드 · 목표 {view.options.targetScore}점
          </span>
          {!snapshot.local && <span className="alc-code">방 {snapshot.code}</span>}
        </div>
        <span />
      </header>

      <div className={`turn-banner ${isMyTurn ? 'is-mine' : ''} ${view.finalRound && !ended ? 'is-final' : ''}`} role="status">
        <strong>{status}</strong>
        {view.finalRound && !ended && <span className="final-tag">마지막 라운드</span>}
        {absent && (
          <span className="absent">
            {nameOf(active.id)} 님 연결이 끊겼어요.
            <button className="btn btn-small" onClick={() => client.substitute?.(active.id)}>
              봇이 대신 두기
            </button>
          </span>
        )}
        {lastEntry && <span className="last-action">{describeLog(lastEntry, nameOf)}</span>}
      </div>

      <div className="alc-layout">
        <section className="alc-board" aria-label="게임판">
          <div className="opponents">
            {others.map((p) => (
              <PlayerPanel
                key={p.id}
                player={p}
                seat={seatOf(p.id)}
                active={p.id === active.id && !ended}
                isMe={false}
                first={view.players[0].id === p.id}
              />
            ))}
          </div>

          <div className="patrons-row" aria-label="후원자">
            <span className="row-label">후원자</span>
            {view.patrons.map((id) => (
              <PatronTile key={id} id={id} size="sm" />
            ))}
            {view.patrons.length === 0 && <span className="hint">모든 후원자가 떠났어요.</span>}
          </div>

          <div className="market" aria-label="레시피 진열대">
            {([3, 2, 1] as Tier[]).map((tier) => (
              <div key={tier} className="market-row">
                <CardBack
                  tier={tier}
                  count={view.deckCounts[tier]}
                  onClick={view.deckCounts[tier] > 0 ? () => setTarget({ kind: 'deck', tier }) : undefined}
                />
                {view.market[tier].map((id, slot) =>
                  id ? (
                    <RecipeCard
                      key={id}
                      card={CARDS[id]}
                      bonus={me?.bonuses}
                      affordable={!!me && !!paymentFor(me, CARDS[id])}
                      onClick={() => setTarget({ kind: 'card', cardId: id, source: 'market' })}
                    />
                  ) : (
                    <div key={`empty${slot}`} className="card card-md card-slot" />
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="bank" aria-label="정수 은행">
            {ESSENCES.map((e) => (
              <Token
                key={e}
                color={e}
                size="lg"
                count={view.bank[e]}
                selected={selection.filter((x) => x === e).length}
                disabled={!isMyTurn || view.phase !== 'action' || (view.bank[e] === 0 && !selection.includes(e))}
                onClick={() => clickBank(e)}
                label={`${ESSENCE_INFO[e].name} 정수, 은행에 ${view.bank[e]}개`}
              />
            ))}
            <Token color="catalyst" size="lg" count={view.bank.catalyst} label={`촉매, 은행에 ${view.bank.catalyst}개`} />
          </div>
        </section>

        <div className="alc-right">
          {me ? (
            <section className={`my-area ${isMyTurn ? 'is-active' : ''}`} aria-label="내 공방">
              <div className="my-head">
                <span className="player-name">
                  {nameOf(me.id)} <span className="chip chip-me">나</span>
                  {view.players[0].id === me.id && <span className="chip">선</span>}
                </span>
                <span className="my-stats">
                  토큰 <b className={tokenSum(me.tokens) >= MAX_TOKENS ? 'warn' : ''}>{tokenSum(me.tokens)}</b>/10 · 후원{' '}
                  {me.patrons.length}
                </span>
                <span className="player-points" key={me.points}>
                  {me.points}
                  <small>점</small>
                </span>
              </div>
              <div className="my-body">
                <Holdings player={me} />
                <div className="my-reserved">
                  {me.reserved.length === 0 && <span className="hint">예약한 레시피 없음 (최대 3장)</span>}
                  {me.reserved.map((r) =>
                    r.cardId ? (
                      <RecipeCard
                        key={r.cardId}
                        card={CARDS[r.cardId]}
                        size="sm"
                        bonus={me.bonuses}
                        affordable={!!paymentFor(me, CARDS[r.cardId])}
                        onClick={() => setTarget({ kind: 'card', cardId: r.cardId!, source: 'reserve' })}
                      />
                    ) : null,
                  )}
                </div>
                {me.patrons.length > 0 && (
                  <div className="my-patrons">
                    {me.patrons.map((id) => (
                      <PatronTile key={id} id={id} size="sm" />
                    ))}
                  </div>
                )}
              </div>

              <div className="action-bar">
                {!isMyTurn || ended ? (
                  <span className="hint">{ended ? '게임이 끝났어요.' : `${nameOf(active.id)} 님이 생각 중...`}</span>
                ) : view.phase !== 'action' ? (
                  <span className="hint">{view.phase === 'discard' ? '반납할 토큰을 골라 주세요.' : '모실 후원자를 골라 주세요.'}</span>
                ) : selection.length > 0 ? (
                  <>
                    <span className="sel-preview">
                      {selection.map((e, i) => (
                        <Token key={i} color={e} size="sm" />
                      ))}
                    </span>
                    <button className="btn btn-primary" disabled={!!problem} onClick={() => act({ type: 'take', colors: selection })}>
                      가져오기
                    </button>
                    <button className="btn btn-ghost" onClick={() => setSelection([])}>
                      취소
                    </button>
                    {problem ? (
                      <span className="hint">{problem}</span>
                    ) : overflow > 0 ? (
                      <span className="hint warn">10개를 넘으면 {overflow}개를 반납해야 해요.</span>
                    ) : null}
                  </>
                ) : !hasAnyMove ? (
                  <>
                    <span className="hint">할 수 있는 행동이 없어요.</span>
                    <button className="btn" onClick={() => act({ type: 'pass' })}>
                      넘기기
                    </button>
                  </>
                ) : (
                  <span className="hint">
                    정수를 눌러 가져오거나(다른 색 3개 · 같은 색 2개), 레시피를 눌러 익히거나 예약하세요.
                  </span>
                )}
              </div>
            </section>
          ) : (
            <section className="my-area">
              <p className="hint center">관전 중이에요.</p>
            </section>
          )}
          <aside className="alc-side">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={sideTab === 'log'} className={sideTab === 'log' ? 'is-on' : ''} onClick={() => setSideTab('log')}>
                기록
              </button>
              {!snapshot.local && (
                <button role="tab" aria-selected={sideTab === 'chat'} className={sideTab === 'chat' ? 'is-on' : ''} onClick={() => setSideTab('chat')}>
                  채팅{unreadChat > 0 && sideTab !== 'chat' && <span className="badge">{unreadChat}</span>}
                </button>
              )}
            </div>
            {sideTab === 'log' ? (
              <ol className="log" reversed>
                {[...view.log].reverse().map((entry, i) => (
                  <li key={view.log.length - i} className={`log-${entry.kind}`}>
                    {describeLog(entry, nameOf)}
                  </li>
                ))}
                {view.log.length === 0 && <li className="hint">첫 수를 기다리는 중...</li>}
              </ol>
            ) : (
              <ChatBox messages={snapshot.chat} onSend={(t) => client.chat(t)} />
            )}
          </aside>
        </div>
      </div>


      {target && (
        <CardModal
          target={target}
          me={me}
          view={view}
          canAct={isMyTurn && view.phase === 'action'}
          onBuy={(id) => act({ type: 'buy', cardId: id })}
          onReserve={(id) => act({ type: 'reserve', cardId: id })}
          onReserveDeck={(tier) => act({ type: 'reserveDeck', tier })}
          onClose={() => setTarget(null)}
        />
      )}

      {isMyTurn && view.phase === 'discard' && me && <DiscardModal key={snapshot.version} me={me} onConfirm={(tokens) => act({ type: 'discard', tokens })} />}
      {isMyTurn && view.phase === 'patron' && (
        <PatronModal key={snapshot.version} choices={view.patronChoices} onChoose={(id) => act({ type: 'choosePatron', patronId: id })} />
      )}

      {ended && view.result && showResult && (
        <div className="modal-backdrop">
          <div className="modal result" role="dialog" aria-label="결과">
            <h2>
              {view.result.winners.includes(myId ?? '') ? '🏆 승리!' : '게임 끝'}
            </h2>
            <ol className="ranking">
              {view.result.ranking.map((r, i) => {
                const winner = view.result!.winners.includes(r.playerId);
                return (
                  <li key={r.playerId} className={winner ? 'is-winner' : ''}>
                    <span className="rank">{winner ? '👑' : i + 1}</span>
                    <span className="rank-name">{nameOf(r.playerId)}</span>
                    <span className="rank-score">{r.score}점</span>
                    <span className="rank-sub">레시피 {r.tiebreak}장</span>
                  </li>
                );
              })}
            </ol>
            <p className="hint center">동점이면 레시피를 적게 익힌 사람이 이겨요.</p>
            <div className="modal-actions">
              {snapshot.isHost ? (
                <button className="btn btn-primary" onClick={() => client.backToLobby?.()}>
                  한 판 더 (대기실로)
                </button>
              ) : (
                <span className="hint">방장이 다음 판을 열면 자동으로 이동해요.</span>
              )}
              <button className="btn" onClick={() => setShowResult(false)}>
                판 살펴보기
              </button>
            </div>
          </div>
        </div>
      )}
      {ended && !showResult && (
        <button className="btn btn-primary floating-result" onClick={() => setShowResult(true)}>
          결과 보기
        </button>
      )}
    </div>
  );
}
