import { it } from 'vitest';
import { createRng } from '../../engine/rng';
import { CARDS } from './data';
import { alchemyGame } from './index';
import { pointsOf } from './rules';

/** 봇끼리 많이 돌려서 게임 길이와 선 플레이어 승률을 본다. npm run sim */
it('balance', () => {
  const GAMES = Number(process.env.GAMES ?? 2000);
  const counts = (process.env.PLAYERS ?? '2,3,4').split(',').map(Number);
  for (const n of counts) {
    let rounds = 0, stalls = 0, winPts = 0, patrons = 0, stuckGames = 0;
    const seatWins = Array(n).fill(0);
    const tierBuys = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    const winnerTier = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    let reserves = 0, deckReserves = 0, roundsMax = 0, roundsMin = 999;
    for (let g = 0; g < GAMES; g++) {
      const players = ['a', 'b', 'c', 'd'].slice(0, n);
      let s = alchemyGame.setup(players, { targetScore: 15 }, g + 1000 * n);
      const random = createRng(g * 31 + 7);
      let steps = 0;
      while (alchemyGame.activePlayer(s) && steps++ < 5000) {
        const p = alchemyGame.activePlayer(s)!;
        s = alchemyGame.apply(s, p, alchemyGame.bot!(s, p, random));
      }
      if (alchemyGame.activePlayer(s)) {
        stuckGames++;
        continue;
      }
      rounds += s.round;
      roundsMax = Math.max(roundsMax, s.round);
      roundsMin = Math.min(roundsMin, s.round);
      if (!s.finalRound) stalls++;
      const w = s.result!.winners[0];
      seatWins[s.players.findIndex((p) => p.id === w)] += 1 / s.result!.winners.length;
      const wp = s.players.find((p) => p.id === w)!;
      winPts += pointsOf(wp);
      for (const id of wp.cards) winnerTier[CARDS[id].tier]++;
      for (const p of s.players) {
        patrons += p.patrons.length;
        for (const id of p.cards) tierBuys[CARDS[id].tier]++;
      }
      for (const e of s.log) if (e.kind === 'reserve') { reserves++; if (!e.cardId) deckReserves++; }
    }
    const pct = (x: number) => ((100 * x) / GAMES).toFixed(1) + '%';
    console.log(
      `[${n}인] 평균 ${(rounds / GAMES).toFixed(1)}라운드 (최소 ${roundsMin}, 최대 ${roundsMax}) | 막힘 ${pct(stalls)} | 승자 평균 ${(winPts / GAMES).toFixed(1)}점\n` +
        `   자리별 승률: ${seatWins.map(pct).join(' / ')}\n` +
        `   판당 구매 1/2/3단계: ${[1, 2, 3].map((t) => (tierBuys[t] / GAMES).toFixed(1)).join(' / ')} | 승자 구매: ${[1, 2, 3].map((t) => (winnerTier[t] / GAMES).toFixed(1)).join(' / ')}\n` +
        `   판당 쌤 ${(patrons / GAMES).toFixed(2)} | 예약 ${(reserves / GAMES).toFixed(1)} (덱 ${(deckReserves / GAMES).toFixed(1)}) | 안 끝난 판 ${stuckGames}`,
    );
  }
});
