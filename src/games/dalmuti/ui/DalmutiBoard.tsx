import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatBox } from '../../../ui/ChatBox';
import { navigate } from '../../../ui/router';
import { useTurnAlert } from '../../alchemy/ui/useTurnAlert';
import { Modal } from '../../alchemy/ui/modals';
import type { BoardProps } from '../../registry';
import { cardRank, rankInfo, titleFor } from '../data';
import { setRank } from '../rules';
import type { DAction, DView } from '../types';
import { CardBackMini, CardFace } from './CardFace';
import { describeDLog } from './format';

/** 손패를 같은 숫자끼리 묶기 */
function groupHand(hand: string[]): string[][] {
  const groups: string[][] = [];
  for (const c of hand) {
    const last = groups[groups.length - 1];
    if (last && cardRank(last[0]) === cardRank(c)) last.push(c);
    else groups.push([c]);
  }
  return groups;
}

export function DalmutiBoard({ snapshot, client }: BoardProps) {
  const view = snapshot.view as DView;
  const myId = snapshot.myId;
  const me = view.players.find((p) => p.id === myId) ?? null;
  const hand = me?.hand ?? [];
  const seatOf = (id: string) => snapshot.seats.find((s) => s.id === id);
  const nameOf = (id: string) => seatOf(id)?.name ?? '?';
  const n = view.players.length;
  const roundOver = view.phase === 'roundEnd';
  const isMyTurn = !!me && view.phase === 'play' && view.turn === me.id;

  const [selected, setSelected] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenChat, setSeenChat] = useState(snapshot.chat.length);
  const [showResult, setShowResult] = useState(true);

  useTurnAlert(isMyTurn || view.canRevolt || !!view.myTaxReturn);

  // 상태가 바뀌면 고른 카드 중 손에 없는 것은 빼기
  const lastVersion = useRef(snapshot.version);
  useEffect(() => {
    if (lastVersion.current !== snapshot.version) {
      lastVersion.current = snapshot.version;
      setSelected((sel) => sel.filter((c) => hand.includes(c)));
      if (view.phase !== 'roundEnd') setShowResult(true);
    }
  }, [snapshot.version, hand, view.phase]);

  useEffect(() => {
    if (chatOpen) setSeenChat(snapshot.chat.length);
  }, [chatOpen, snapshot.chat.length]);

  const act = (a: DAction) => client.act(a);
  const toggle = (c: string) => setSelected((sel) => (sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c]));

  const problem = useMemo(() => {
    if (!isMyTurn) return null;
    if (selected.length === 0) return view.trick ? `${view.trick.count}장을 고르거나 패스하세요.` : '아무 카드나 같은 숫자로 골라 내세요.';
    const r = setRank(selected);
    if (r === null) return '같은 숫자 카드만 함께 낼 수 있어요. (어릿광대는 섞어도 돼요)';
    if (view.trick) {
      if (selected.length !== view.trick.count) return `${view.trick.count}장을 내야 해요.`;
      if (r >= view.trick.rank) return `${view.trick.rank}보다 작은 숫자를 내야 해요.`;
    }
    return null;
  }, [isMyTurn, selected, view.trick]);

  const active = view.players.find((p) => p.id === view.turn);
  const activeSeat = view.turn ? seatOf(view.turn) : undefined;
  const absent = !roundOver && !!me && !!client.substitute && !!activeSeat && !activeSeat.bot && !activeSeat.connected;
  const lastEntry = [...view.log].reverse().find((e) => e.kind !== 'deal' || view.log.length === 1);
  const unreadChat = snapshot.chat.length - seenChat;

  let status: string;
  if (roundOver) status = `${view.round}판 끝!`;
  else if (view.phase === 'revolution') status = view.canRevolt ? '혁명을 선언할 수 있어요!' : '누군가 혁명을 고민하는 중...';
  else if (view.phase === 'tax')
    status = view.myTaxReturn
      ? `${nameOf(view.myTaxReturn.to)} 님에게 돌려줄 카드 ${view.myTaxReturn.count}장을 고르세요`
      : '세금 정리 중... (대왕 · 귀족이 카드를 돌려주는 중)';
  else if (isMyTurn) status = view.trick ? '내 차례예요!' : '내 차례예요! 아무 카드나 내세요';
  else status = `${active ? nameOf(active.id) : '?'} 님 차례`;

  return (
    <div className={`dal ${isMyTurn ? 'my-turn' : ''}`}>
      <header className="alc-top">
        <button
          className="btn btn-ghost btn-small"
          onClick={() => {
            if (roundOver || confirm('게임에서 나갈까요? 같은 링크로 다시 들어올 수 있어요.')) navigate('/');
          }}
        >
          ← 나가기
        </button>
        <div className="alc-title">
          <span>생무티 · {view.round}판째</span>
          {!snapshot.local && <span className="alc-code">방 {snapshot.code}</span>}
        </div>
        {snapshot.local ? (
          <span />
        ) : (
          <button className="btn btn-ghost btn-small chat-toggle" onClick={() => setChatOpen(!chatOpen)}>
            채팅{unreadChat > 0 && !chatOpen && <span className="badge">{unreadChat}</span>}
          </button>
        )}
      </header>

      <div className={`turn-banner ${isMyTurn || view.canRevolt || view.myTaxReturn ? 'is-mine' : ''}`} role="status">
        <strong>{status}</strong>
        {absent && (
          <span className="absent">
            {nameOf(view.turn!)} 님 연결이 끊겼어요.
            <button className="btn btn-small" onClick={() => client.substitute?.(view.turn!)}>
              대신 넘기기
            </button>
          </span>
        )}
        {lastEntry && <span className="last-action">{describeDLog(lastEntry, nameOf)}</span>}
      </div>

      <section className="dal-table" aria-label="테이블">
        <div className="dal-seats">
          {view.players.map((p, i) => {
            const seat = seatOf(p.id);
            const title = p.lastPlace !== null && p.lastPlace >= 0 ? titleFor(p.lastPlace, n) : null;
            return (
              <div
                key={p.id}
                className={`dal-seat ${view.turn === p.id && !roundOver ? 'is-active' : ''} ${p.id === myId ? 'is-me' : ''} ${p.count === 0 ? 'is-out' : ''}`}
              >
                <div className="dal-seat-head">
                  <span className={`dot ${seat?.connected === false ? 'off' : 'on'}`} />
                  <span className="dal-seat-name">{seat?.name ?? '?'}</span>
                  {p.id === myId && <span className="chip chip-me">나</span>}
                </div>
                <div className="dal-seat-info">
                  <span className="dal-order">{i + 1}번 자리</span>
                  {title && <span className={`dal-title t-${title}`}>{title}</span>}
                </div>
                <div className="dal-seat-foot">
                  {p.finishedPlace !== null ? (
                    <span className="dal-done">{p.finishedPlace + 1}등!</span>
                  ) : (
                    <CardBackMini count={p.count} />
                  )}
                  {p.passed && <span className="dal-pass">패스</span>}
                  <span className="dal-score" title="누적 점수">
                    {p.score}점
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dal-center">
          {view.trick ? (
            <>
              <div className="dal-trick">
                {view.trick.cards.map((c) => (
                  <CardFace key={c} id={c} size="lg" />
                ))}
              </div>
              <p className="dal-trick-by">
                <b>{nameOf(view.trick.by)}</b> 님이 낸 카드 · 다음은 <b>{view.trick.rank}</b>보다 작은 숫자 {view.trick.count}장
              </p>
            </>
          ) : view.phase === 'play' ? (
            <p className="dal-empty">
              <b>{active ? nameOf(active.id) : '?'}</b> 님이 선이에요. 같은 숫자 카드를 원하는 만큼 낼 수 있어요.
            </p>
          ) : (
            <p className="dal-empty">{status}</p>
          )}
        </div>
      </section>

      {me ? (
        <section className={`dal-hand-area ${isMyTurn ? 'is-active' : ''}`} aria-label="내 손패">
          <div className="dal-hand-head">
            <span className="player-name">
              내 손패 <b>{hand.length}</b>장
            </span>
            {view.myTaxGiven && (
              <span className="hint">
                {nameOf(view.myTaxGiven.to)} 님에게 {view.myTaxGiven.cards.map((c) => rankInfo(cardRank(c))?.name).join(', ')}을(를) 바쳤어요
              </span>
            )}
          </div>
          <div className="dal-hand">
            {hand.length === 0 && <p className="hint">다 냈어요! 다른 사람들을 기다리는 중...</p>}
            {groupHand(hand).map((g) => (
              <div key={g[0]} className="dal-group">
                {g.map((c) => (
                  <CardFace key={c} id={c} selected={selected.includes(c)} onClick={() => toggle(c)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="dal-hand-area">
          <p className="hint center">관전 중이에요.</p>
        </section>
      )}

      {me && (
        <div className="action-bar">
          {isMyTurn ? (
            <>
              <button className="btn btn-primary" disabled={!!problem} onClick={() => act({ type: 'play', cards: selected })}>
                {selected.length ? `${selected.length}장 내기` : '내기'}
              </button>
              {view.trick && (
                <button className="btn" onClick={() => act({ type: 'pass' })}>
                  패스
                </button>
              )}
              {selected.length > 0 && (
                <button className="btn btn-ghost" onClick={() => setSelected([])}>
                  선택 취소
                </button>
              )}
              {problem && <span className="hint">{problem}</span>}
            </>
          ) : (
            <span className="hint">{roundOver ? '판이 끝났어요.' : status}</span>
          )}
        </div>
      )}

      {view.canRevolt && (
        <Modal title="✊ 혁명을 선언할까요?">
          <p>어릿광대 2장이 모두 내 손에 들어왔어요!</p>
          <ul className="rules-list">
            <li>혁명을 선언하면 이번 판은 세금(카드 바치기)이 없어요.</li>
            <li>꼴찌(노비)가 선언하면 대혁명! 등수가 통째로 뒤집혀요.</li>
          </ul>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => act({ type: 'revolution', declare: true })}>
              혁명 선언!
            </button>
            <button className="btn" onClick={() => act({ type: 'revolution', declare: false })}>
              안 할래요
            </button>
          </div>
        </Modal>
      )}

      {view.myTaxReturn && view.phase === 'tax' && (
        <TaxReturnModal
          key={snapshot.version}
          hand={hand}
          count={view.myTaxReturn.count}
          received={view.myTaxReturn.received}
          to={nameOf(view.myTaxReturn.to)}
          onConfirm={(cards) => act({ type: 'taxReturn', cards })}
        />
      )}

      {roundOver && showResult && (
        <div className="modal-backdrop">
          <div className="modal result" role="dialog" aria-label="판 결과">
            <h2>{view.round}판 결과</h2>
            <ol className="ranking">
              {view.finished.map((id, i) => (
                <li key={id} className={i === 0 ? 'is-winner' : ''}>
                  <span className="rank">{i === 0 ? '👑' : i + 1}</span>
                  <span className="rank-name">
                    {nameOf(id)} <span className={`dal-title t-${titleFor(i, n)}`}>{titleFor(i, n)}</span>
                  </span>
                  <span className="rank-score">+{n - 1 - i}</span>
                  <span className="rank-sub">누적 {view.players.find((p) => p.id === id)?.score ?? 0}점</span>
                </li>
              ))}
            </ol>
            <p className="hint center">다음 판은 이 등수대로 앉아요. 노비는 가장 좋은 카드 2장, 하인은 1장을 바쳐요.</p>
            <div className="modal-actions">
              {snapshot.isHost ? (
                <>
                  <button className="btn btn-primary" onClick={() => act({ type: 'deal', seed: Math.floor(Math.random() * 2 ** 31) })}>
                    다음 판 시작
                  </button>
                  <button className="btn" onClick={() => client.backToLobby?.()}>
                    대기실로
                  </button>
                </>
              ) : (
                <span className="hint">방장이 다음 판을 시작하길 기다리는 중...</span>
              )}
              <button className="btn btn-ghost" onClick={() => setShowResult(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {roundOver && !showResult && (
        <button className="btn btn-primary floating-result" onClick={() => setShowResult(true)}>
          결과 보기
        </button>
      )}

      {chatOpen && !snapshot.local && (
        <div className="chat-drawer" role="dialog" aria-label="채팅">
          <div className="modal-head">
            <h2>채팅</h2>
            <button className="btn btn-ghost btn-small" onClick={() => setChatOpen(false)} aria-label="채팅 닫기">
              ✕
            </button>
          </div>
          <ChatBox messages={snapshot.chat} onSend={(t) => client.chat(t)} />
        </div>
      )}
    </div>
  );
}

function TaxReturnModal({
  hand,
  count,
  received,
  to,
  onConfirm,
}: {
  hand: string[];
  count: number;
  received: string[];
  to: string;
  onConfirm: (cards: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (c: string) =>
    setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length < count ? [...s, c] : s));
  return (
    <Modal title={`${to} 님에게 카드 ${count}장 돌려주기`}>
      <p className="hint">
        세금으로 좋은 카드를 받았어요 (「받음」 표시). 대신 아무 카드나 {count}장을 골라 돌려주세요.
      </p>
      <div className="dal-hand dal-hand-modal">
        {groupHand(hand).map((g) => (
          <div key={g[0]} className="dal-group">
            {g.map((c) => (
              <CardFace
                key={c}
                id={c}
                size="sm"
                selected={sel.includes(c)}
                marked={received.includes(c) ? '받음' : undefined}
                onClick={() => toggle(c)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={sel.length !== count} onClick={() => onConfirm(sel)}>
          {sel.length}/{count}장 돌려주기
        </button>
      </div>
    </Modal>
  );
}
