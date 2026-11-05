import type { ReactNode } from 'react';
import { CARDS, PATRONS, TIER_INFO } from '../data';
import { TOKEN_COLORS, type LogEntry } from '../types';
import { EssenceIcon } from './icons';

export function describeLog(entry: LogEntry, nameOf: (id: string) => string): ReactNode {
  switch (entry.kind) {
    case 'take':
      return (
        <>
          <b>{nameOf(entry.player)}</b> 정수 가져옴{' '}
          <span className="log-icons">
            {entry.tokens.map((c, i) => (
              <span key={i} className={`log-ess ess-${c}`}>
                <EssenceIcon color={c} size={13} />
              </span>
            ))}
          </span>
        </>
      );
    case 'buy': {
      const card = CARDS[entry.cardId];
      return (
        <>
          <b>{nameOf(entry.player)}</b> <span className={`log-card ess-${card.essence}`}>「{card.name}」</span> 익힘
          {card.points > 0 && <span className="log-pts"> +{card.points}점</span>}
          {entry.fromReserve && ' (예약해 둔 것)'}
        </>
      );
    }
    case 'reserve': {
      const card = entry.cardId ? CARDS[entry.cardId] : null;
      return (
        <>
          <b>{nameOf(entry.player)}</b>{' '}
          {card ? (
            <>
              <span className={`log-card ess-${card.essence}`}>「{card.name}」</span> 예약
            </>
          ) : (
            <>{TIER_INFO[entry.tier].name} 덱에서 몰래 예약</>
          )}
          {entry.catalyst && (
            <>
              {' '}
              <span className="log-ess ess-catalyst">
                <EssenceIcon color="catalyst" size={13} />
              </span>
              +1
            </>
          )}
        </>
      );
    }
    case 'discard':
      return (
        <>
          <b>{nameOf(entry.player)}</b> 토큰 반납{' '}
          <span className="log-icons">
            {TOKEN_COLORS.flatMap((c) =>
              Array.from({ length: entry.tokens[c] ?? 0 }, (_, i) => (
                <span key={`${c}${i}`} className={`log-ess ess-${c}`}>
                  <EssenceIcon color={c} size={13} />
                </span>
              )),
            )}
          </span>
        </>
      );
    case 'patron':
      return (
        <>
          🎉 <b>{PATRONS[entry.patronId].name}</b>이(가) <b>{nameOf(entry.player)}</b>님을 후원! <span className="log-pts">+3점</span>
        </>
      );
    case 'pass':
      return (
        <>
          <b>{nameOf(entry.player)}</b> 할 수 있는 게 없어 넘김
        </>
      );
    case 'finalRound':
      return (
        <>
          ⏳ <b>{nameOf(entry.player)}</b>님이 목표 점수 달성! 이번 라운드가 마지막이에요.
        </>
      );
    case 'end':
      return <>🏁 게임 끝</>;
  }
}
