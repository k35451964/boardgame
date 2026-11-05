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
};

export function getMyName(): string {
  return load<string>(keys.name) ?? '';
}

export function setMyName(name: string): void {
  save(keys.name, name.trim().slice(0, 12));
}
