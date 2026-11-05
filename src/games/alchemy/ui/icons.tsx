import type { ReactElement } from 'react';
import type { TokenColor } from '../types';

const SHAPES: Record<TokenColor, ReactElement> = {
  fire: (
    <path d="M12 2.2c-.4 3.2-2.4 5-4 7.1C6.7 11 6 12.6 6 14.6a6 6 0 0 0 12 0c0-2.3-1-4.2-2.4-5.8-.2 1.5-1 2.7-2.2 3.2.5-3.4-.2-6.7-1.4-9.8zM12 20a2.8 2.8 0 0 1-2.8-2.8c0-1.7 1.4-2.7 2.3-4.3.5 1.4 1.4 2 2.2 2.8.7.6 1.1 1.2 1.1 1.8A2.8 2.8 0 0 1 12 20z" />
  ),
  water: <path d="M12 2.5C8.4 7.3 5.6 10.8 5.6 14.4a6.4 6.4 0 0 0 12.8 0c0-3.6-2.8-7.1-6.4-11.9zm-2.6 11.2a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 0 1 0 2 4 4 0 0 1-4-4 1 1 0 0 1 1-1z" />,
  life: (
    <path d="M19.8 3.4C11.6 3.6 5.2 7.3 5.2 14c0 1.3.3 2.5.9 3.5l-2.4 2.4 1.4 1.4 2.4-2.4c1 .6 2.3.9 3.6.9 6.6 0 9.4-6.7 8.7-16.4zM8.8 16.6c1.6-3.2 4.2-5.9 7.6-7.8-2.5 2.4-4.6 5.1-6.1 8.3z" />
  ),
  light: (
    <g>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 1.8l1.2 3.3h-2.4zM12 22.2l-1.2-3.3h2.4zM1.8 12l3.3-1.2v2.4zM22.2 12l-3.3 1.2v-2.4zM4.8 4.8l3.2 1.5-1.7 1.7zM19.2 19.2L16 17.7l1.7-1.7zM4.8 19.2l1.5-3.2 1.7 1.7zM19.2 4.8l-1.5 3.2-1.7-1.7z" />
    </g>
  ),
  shadow: <path d="M14.8 2.6A9.6 9.6 0 1 0 21.4 16a7.8 7.8 0 0 1-6.6-13.4zM17.5 6.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" />,
  catalyst: (
    <g>
      <path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" opacity=".35" />
      <path d="M12 5.2l6.2 10.6H5.8zM12 8.6l-3.3 5.6h6.6z" fillRule="evenodd" />
      <circle cx="12" cy="12.6" r="1.3" />
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
