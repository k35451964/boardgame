import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';
import { FIREBASE_CONFIG } from '../config';

/**
 * 개발할 때는 환경 변수로 설정을 덮어쓸 수 있다.
 * VITE_FIREBASE_EMULATOR=127.0.0.1 이면 내 컴퓨터의 Firebase 에뮬레이터에 붙는다.
 */
function resolveConfig() {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || FIREBASE_CONFIG.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_CONFIG.authDomain,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || FIREBASE_CONFIG.databaseURL,
    projectId: env.VITE_FIREBASE_PROJECT_ID || FIREBASE_CONFIG.projectId,
    appId: env.VITE_FIREBASE_APP_ID || FIREBASE_CONFIG.appId,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = resolveConfig();
  return !!(c.apiKey && c.databaseURL && c.projectId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let uidPromise: Promise<string> | null = null;

function init() {
  if (app) return;
  app = initializeApp(resolveConfig());
  // 익명 로그인만 쓰므로 구글 로그인 팝업용 스크립트는 불러오지 않는다
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  db = getDatabase(app);
  const emulator = import.meta.env.VITE_FIREBASE_EMULATOR;
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true });
    connectDatabaseEmulator(db, emulator, 9000);
  }
}

export function database(): Database {
  init();
  return db!;
}

/** 익명 로그인. 같은 브라우저에서는 계속 같은 id가 유지된다. */
export function myUid(): Promise<string> {
  init();
  uidPromise ??= new Promise<string>((resolve, reject) => {
    const stop = onAuthStateChanged(
      auth!,
      (user) => {
        if (user) {
          stop();
          resolve(user.uid);
        } else {
          signInAnonymously(auth!).catch((e) => {
            stop();
            uidPromise = null;
            reject(e);
          });
        }
      },
      (e) => {
        uidPromise = null;
        reject(e);
      },
    );
  });
  return uidPromise;
}
