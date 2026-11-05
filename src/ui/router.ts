import { useEffect, useState } from 'react';

/** GitHub Pages에서도 새로고침이 되도록 주소의 # 뒤를 경로로 쓴다. 예: /#/room/ABCDE */
export function useHashPath(): string {
  const [path, setPath] = useState(() => readPath());
  useEffect(() => {
    const onChange = () => setPath(readPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

function readPath(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function roomLink(code: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/room/${code}`;
}
