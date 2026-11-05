import type { SeatInfo } from '../../../net/types';
import { CARDS, ESSENCE_INFO, PATRONS, TIER_INFO } from '../data';
import { ESSENCES, type Card, type Essence, type PlayerView, type Tier, type TokenColor, type TokenCounts } from '../types';
import { EssenceIcon } from './icons';

const ROMAN: Record<Tier, string> = { 1: 'I', 2: 'II', 3: 'III' };

export function Token({
  color,
  count,
  selected = 0,
  disabled,
  onClick,
  size = 'md',
  label,
}: {
  color: TokenColor;
  count?: number;
  selected?: number;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={`token token-${size} ess-${color} ${selected ? 'is-selected' : ''} ${count === 0 ? 'is-empty' : ''}`}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label ?? `${ESSENCE_INFO[color].name}${count !== undefined ? ` ${count}개` : ''}`}
      type={onClick ? 'button' : undefined}
    >
      <EssenceIcon color={color} size={size === 'sm' ? 13 : size === 'lg' ? 26 : 20} />
      {count !== undefined && (
        <span className="token-count" key={count}>
          {count}
        </span>
      )}
      {selected > 0 && <span className="token-sel">{selected > 1 ? `×${selected}` : '✓'}</span>}
    </Tag>
  );
}

export function CostPips({ cost, bonus }: { cost: Record<Essence, number>; bonus?: Record<Essence, number> }) {
  return (
    <span className="pips">
      {ESSENCES.filter((e) => cost[e] > 0).map((e) => (
        <span
          key={e}
          className={`pip ess-${e} ${bonus && bonus[e] >= cost[e] ? 'is-covered' : ''}`}
          title={`${ESSENCE_INFO[e].name} ${cost[e]}`}
        >
          {cost[e]}
        </span>
      ))}
    </span>
  );
}

export function RecipeCard({
  card,
  onClick,
  affordable,
  bonus,
  size = 'md',
}: {
  card: Card;
  onClick?: () => void;
  affordable?: boolean;
  bonus?: Record<Essence, number>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card card-${size} tier-${card.tier} ess-${card.essence} ${affordable ? 'can-buy' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={`${card.name}, ${card.points}점, ${ESSENCE_INFO[card.essence].name} 레시피`}
    >
      <span className="card-top">
        <span className="card-points">{card.points > 0 ? card.points : ''}</span>
        <span className="card-gem">
          <EssenceIcon color={card.essence} size={size === 'sm' ? 14 : size === 'lg' ? 26 : 18} />
        </span>
      </span>
      <span className="card-name">{card.name}</span>
      <span className="card-bottom">
        <CostPips cost={card.cost} bonus={bonus} />
        <span className="card-tier">{ROMAN[card.tier]}</span>
      </span>
    </Tag>
  );
}

export function CardBack({ tier, count, onClick, size = 'md' }: { tier: Tier; count?: number; onClick?: () => void; size?: 'sm' | 'md' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card card-back card-${size} tier-${tier} ${count === 0 ? 'is-empty' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={`${TIER_INFO[tier].name} 덱${count !== undefined ? ` ${count}장` : ''}`}
    >
      <span className="card-back-tier">{ROMAN[tier]}</span>
      <span className="card-back-name">{TIER_INFO[tier].name}</span>
      {count !== undefined && <span className="card-back-count">{count}장</span>}
    </Tag>
  );
}

export function PatronTile({ id, size = 'md', onClick, selected }: { id: string; size?: 'sm' | 'md'; onClick?: () => void; selected?: boolean }) {
  const p = PATRONS[id];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`patron patron-${size} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={`후원자 ${p.name}, ${p.points}점`}
    >
      <span className="patron-points">{p.points}</span>
      <span className="patron-name">{p.name}</span>
      <span className="patron-req">
        {ESSENCES.filter((e) => p.require[e] > 0).map((e) => (
          <span key={e} className={`req ess-${e}`} title={`${ESSENCE_INFO[e].name} 레시피 ${p.require[e]}장`}>
            {p.require[e]}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** 정수별로 "레시피(할인) 수 + 토큰 수"를 보여주는 줄 */
export function Holdings({ player, size = 'md' }: { player: PlayerView; size?: 'sm' | 'md' }) {
  return (
    <div className={`holdings holdings-${size}`}>
      {ESSENCES.map((e) => (
        <div key={e} className={`holding ess-${e}`} title={`${ESSENCE_INFO[e].name}: 레시피 ${player.bonuses[e]}장, 토큰 ${player.tokens[e]}개`}>
          <span className="holding-bonus">{player.bonuses[e]}</span>
          <span className="holding-tokens">
            <EssenceIcon color={e} size={size === 'sm' ? 11 : 13} />
            {player.tokens[e]}
          </span>
        </div>
      ))}
      <div className="holding ess-catalyst" title={`촉매 ${player.tokens.catalyst}개`}>
        <span className="holding-bonus">
          <EssenceIcon color="catalyst" size={size === 'sm' ? 12 : 15} />
        </span>
        <span className="holding-tokens">{player.tokens.catalyst}</span>
      </div>
    </div>
  );
}

export function tokenSum(t: TokenCounts): number {
  return ESSENCES.reduce((s, e) => s + t[e], 0) + t.catalyst;
}

export function PlayerPanel({
  player,
  seat,
  active,
  isMe,
  first,
}: {
  player: PlayerView;
  seat?: SeatInfo;
  active: boolean;
  isMe: boolean;
  first: boolean;
}) {
  return (
    <div className={`player ${active ? 'is-active' : ''} ${isMe ? 'is-me' : ''}`}>
      <div className="player-head">
        <span className={`dot ${seat?.connected === false ? 'off' : 'on'}`} />
        <span className="player-name">
          {seat?.name ?? '?'}
          {isMe && <span className="chip chip-me">나</span>}
          {first && <span className="chip" title="선 플레이어">선</span>}
        </span>
        <span className="player-points" key={player.points}>
          {player.points}
          <small>점</small>
        </span>
      </div>
      <Holdings player={player} size="sm" />
      <div className="player-foot">
        <span title="보유 토큰 (최대 10)">토큰 {tokenSum(player.tokens)}/10</span>
        <span title="예약한 레시피">
          예약 {player.reserved.length}/3
        </span>
        {player.patrons.length > 0 && <span title="후원자">후원 {player.patrons.length}</span>}
      </div>
    </div>
  );
}

export function cardById(id: string): Card {
  return CARDS[id];
}
