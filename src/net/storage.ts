/** localStorage는 사생활 보호 모드 등에서 실패할 수 있으므로 항상 감싸서 쓴다. */
export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시 */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 무시 */
  }
}

export const keys = {
  name: 'sg:name',
  token: (code: string) => `sg:token:${code}`,
  host: (code: string) => `sg:host:${code}`,
};

export function getMyName(): string {
  return load<string>(keys.name) ?? '';
}

export function setMyName(name: string): void {
  save(keys.name, name.trim().slice(0, 12));
}

export function getToken(code: string): string {
  let token = load<string>(keys.token(code));
  if (!token) {
    token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    save(keys.token(code), token);
  }
  return token;
}
