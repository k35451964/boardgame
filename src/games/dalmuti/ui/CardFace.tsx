import { JOKER_RANK, cardRank, rankInfo } from '../data';

/** 숫자마다 다른 색 */
const HUES = [0, 22, 45, 80, 130, 165, 195, 215, 245, 275, 305, 330];

export function cardHue(rank: number): number {
  return HUES[(rank - 1) % HUES.length];
}

export function CardFace({
  id,
  rank: rankProp,
  selected,
  marked,
  onClick,
  size = 'md',
}: {
  id?: string;
  rank?: number;
  selected?: boolean;
  /** 받은 카드 등 표시 */
  marked?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const rank = rankProp ?? cardRank(id!);
  const info = rankInfo(rank) ?? { rank, name: '?', emoji: '🂠' };
  const joker = rank === JOKER_RANK;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`dcard dcard-${size} ${joker ? 'is-joker' : ''} ${selected ? 'is-selected' : ''}`}
      style={joker ? undefined : ({ '--h': cardHue(rank) } as React.CSSProperties)}
      onClick={onClick}
      aria-label={`${info.name}${info.tag ? `(${info.tag})` : ''} ${joker ? '어릿광대' : `${rank}번`}`}
      aria-pressed={onClick ? !!selected : undefined}
    >
      <span className="dcard-rank">{joker ? '★' : rank}</span>
      <span className="dcard-emoji" aria-hidden>
        {info.emoji}
      </span>
      <span className="dcard-name">{info.name}</span>
      {info.tag && <span className="dcard-tag">{info.tag}</span>}
      {marked && <span className="dcard-mark">{marked}</span>}
    </Tag>
  );
}

export function CardBackMini({ count }: { count: number }) {
  return (
    <span className="dback" aria-label={`카드 ${count}장`}>
      <span className="dback-card" />
      <b>{count}</b>
    </span>
  );
}
