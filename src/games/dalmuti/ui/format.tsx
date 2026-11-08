import type { ReactNode } from 'react';
import { rankInfo } from '../data';
import type { DLog } from '../types';

export function describeDLog(e: DLog, nameOf: (id: string) => string): ReactNode {
  switch (e.kind) {
    case 'deal':
      return <>{e.round}판 시작! 카드를 나눴어요.</>;
    case 'play': {
      const info = rankInfo(e.rank) ?? { name: '?', emoji: '' };
      return (
        <>
          <b>{nameOf(e.player)}</b> {info.emoji} {info.name} {e.cards.length}장
        </>
      );
    }
    case 'pass':
      return (
        <>
          <b>{nameOf(e.player)}</b> {e.absent ? '자리 비움 (넘김)' : '패스'}
        </>
      );
    case 'newTrick':
      return (
        <>
          모두 패스! <b>{nameOf(e.player)}</b> 님이 새로 시작해요
        </>
      );
    case 'finish':
      return (
        <>
          🎉 <b>{nameOf(e.player)}</b> {e.place}등으로 다 냈어요!
        </>
      );
    case 'tax':
      return (
        <>
          <b>{nameOf(e.from)}</b> → <b>{nameOf(e.to)}</b> 카드 {e.count}장
        </>
      );
    case 'revolution':
      return (
        <>
          ✊ <b>{nameOf(e.player)}</b> {e.greater ? '대혁명! 등수가 뒤집혀요' : '혁명! 이번 판은 세금이 없어요'}
        </>
      );
    case 'roundEnd':
      return <>{e.round}판 끝!</>;
  }
}
