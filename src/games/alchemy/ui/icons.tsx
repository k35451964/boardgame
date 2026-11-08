import type { ReactElement } from 'react';
import type { TokenColor } from '../types';

const SHAPES: Record<TokenColor, ReactElement> = {
  // 무당벌레
  insect: (
    <g>
      <circle cx="12" cy="5.4" r="2.6" />
      <path
        fillRule="evenodd"
        d="M12 7.6c-4.1 0-7.2 3.2-7.2 7.3 0 3.9 3.2 6.8 7.2 6.8s7.2-2.9 7.2-6.8c0-4.1-3.1-7.3-7.2-7.3zM11.4 9h1.2v11.4h-1.2zM8.6 11.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm6.8 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM8.4 16a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm7.2 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"
      />
      <path d="M9.6 3.4 8.2 1.6M14.4 3.4l1.4-1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  ),
  // 물고기
  fish: (
    <path
      fillRule="evenodd"
      d="M1.5 6.5 5.6 12l-4.1 5.5h2.2L7 14.1c1.9 2.6 4.6 4.1 7.6 4.1 4 0 6.9-2.6 7.9-6.2-1-3.6-3.9-6.2-7.9-6.2-3 0-5.7 1.5-7.6 4.1L3.7 6.5zM17.3 9.8a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"
    />
  ),
  // 새싹
  plant: (
    <path d="M11.2 22v-8.6C10.4 9 7.3 6.6 2.6 6.8c.1 4.6 3 7.4 7.4 7.6v7.6zM12.8 22v-6.1c4.6-.1 7.9-3.2 8.6-8.7-5.1-.3-8.4 2.8-8.6 7.4z M11.2 13.4h1.6V22h-1.6z" />
  ),
  // 날아가는 새
  bird: (
    <path d="M1.5 10.2C5 6.6 9.2 7.2 12 12c2.8-4.8 7-5.4 10.5-1.8-3.7-.4-7.2 1.4-10.5 7.3C8.7 11.6 5.2 9.8 1.5 10.2z" />
  ),
  // 산과 해 (서식지)
  env: (
    <g>
      <circle cx="17.4" cy="6" r="2.6" />
      <path d="M1.6 20 8.4 9l3.9 6.1 2.6-3.9L22.4 20z" />
    </g>
  ),
  // 생물교육과: DNA
  joker: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 2.5c0 5 10 5 10 9.5s-10 4.5-10 9.5" />
      <path d="M17 2.5c0 5-10 5-10 9.5s10 4.5 10 9.5" />
      <path d="M8.6 6h6.8M9.6 9h4.8M9.6 15h4.8M8.6 18h6.8" strokeWidth="1.5" />
    </g>
  ),
};

export function EssenceIcon({ color, size = 18 }: { color: TokenColor; size?: number }) {
  return (
    <svg className="ess-icon" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      {SHAPES[color]}
    </svg>
  );
}
