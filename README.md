# 생교 보드게임

친구들과 링크 하나로 바로 하는 브라우저 보드게임 모음.
첫 게임은 **생플렌더**예요. 곤충 · 어류 · 식물 · 조류 · 환경 토큰을 모아 생물 카드를 도감에 등록하고, 등록한 카드로 더 귀한 종을 모으는 엔진 빌딩 게임이에요 (2~4명, 30~45분).
조커는 생물교육과(생교) 토큰, 점수를 주는 타일은 채쌤 · 양쌤 · 김쌤 · 장쌤 · 황쌤 · 과사쌤이에요.

- 로그인 없음: 닉네임만 정하면 끝
- 방 만들기 → 초대 링크를 카톡으로 보내기 → 같이 하기
- 사람이 모자라면 봇을 넣을 수 있고, 혼자 봇과 연습할 수도 있어요
- 누가 창을 닫아도 게임은 그대로. 같은 링크로 다시 들어오면 자기 자리로 돌아와요
- 휴대폰에서도 할 수 있어요

## 처음 한 번만: Firebase 준비

게임 상태는 Firebase Realtime Database에 저장돼요. 무료 요금제(Spark)로 충분해요.

1. https://console.firebase.google.com 에서 **프로젝트 추가** (구글 애널리틱스는 꺼도 돼요)
2. 왼쪽 메뉴 **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치: `asia-southeast1` (싱가포르) 추천
   - 보안 규칙: "잠금 모드"로 시작
3. 같은 화면의 **규칙** 탭에서 내용을 모두 지우고, 이 저장소의 [`database.rules.json`](database.rules.json) 내용을 붙여 넣은 뒤 **게시**
4. **빌드 → Authentication → 시작하기 → 로그인 방법 → 익명** 을 **사용 설정**
5. **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹(`</>`) 앱 추가** → 나오는 `firebaseConfig` 값을
   [`src/config.ts`](src/config.ts) 의 `FIREBASE_CONFIG` 에 붙여 넣기
   (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`)

> `firebaseConfig` 값은 웹사이트에 공개돼도 괜찮은 값이에요. 데이터 보호는 3번에서 올린 보안 규칙이 맡아요.
> 설정이 비어 있으면 사이트는 "봇과 연습"만 할 수 있는 상태로 열려요.

## 배포 (GitHub Pages)

1. GitHub 저장소 → **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로
2. `main` 브랜치에 올리면(push) 자동으로 테스트·빌드·배포돼요 (**Actions** 탭에서 확인)

주소: `https://<GitHub 아이디>.github.io/boardgame/`

## 어떻게 동작하나요?

```
 친구 브라우저 ─┐
 친구 브라우저 ─┼─ 실시간 동기화 ─→ Firebase Realtime Database (방 · 자리 · 게임 상태 · 채팅 · 접속 표시)
 내 브라우저   ─┘
```

- 누가 한 수 두면, 그 사람 브라우저가 규칙 엔진으로 검사한 뒤 DB에 저장해요 (트랜잭션이라 동시에 둬도 꼬이지 않아요). 모두의 화면이 바로 바뀌어요.
- 봇은 그때 접속해 있는 사람의 브라우저가 대신 둬요 (방장이 있으면 방장, 없으면 먼저 들어온 사람).
- 누가 나가서 그 사람 차례에 게임이 멈추면, 다른 사람이 **"봇이 대신 두기"** 를 누를 수 있어요.
- 게임이 시작된 뒤 들어온 사람은 관전자가 돼요. 대기실에서 5번째로 들어온 사람도 관전자예요.

### 알아 둘 점

- 게임 상태 전체가 DB에 있어서, 브라우저 개발자 도구를 열면 **덱 순서나 남이 몰래 예약한 카드를 볼 수 있어요.** 친구끼리 하는 용도라 이렇게 단순하게 만들었어요.
  확실히 막으려면 규칙 검사를 서버(Cloud Functions, 유료 Blaze 요금제)로 옮겨야 해요.
- 보안 규칙이 막는 것: 남의 자리 차지하기, 관전자의 게임 조작, 버전 건너뛰기, 방장이 아닌 사람의 설정 변경·방 삭제, 남인 척 채팅, 긴 채팅.
- 끝난 방 데이터는 방장이 **방 닫기** 를 누르기 전까지 DB에 남아요. 방 하나는 수십 KB라 무료 용량(1GB)에 비하면 아주 작아요.

## 직접 실행해 보기 (개발자용)

Node.js 22 이상이 필요해요.

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173/boardgame/)
npm test           # 규칙 테스트
npm run sim        # 봇끼리 수천 판 돌려서 밸런스 보기
npm run build      # 배포용 파일 만들기 (dist/)
```

실제 Firebase 대신 내 컴퓨터의 에뮬레이터로 개발하려면 (Java 필요):

```bash
npx firebase-tools emulators:start --only auth,database --project demo-saenggyo
```

```bash
VITE_FIREBASE_EMULATOR=127.0.0.1 VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_PROJECT_ID=demo-saenggyo VITE_FIREBASE_DATABASE_URL=https://demo-saenggyo-default-rtdb.firebaseio.com npm run dev
```

## 폴더 구조

```
src/
├─ engine/            모든 게임 공통 규격 (GameDefinition), 시드 난수
├─ games/
│  ├─ registry.ts     게임 목록 (새 게임은 여기에 등록)
│  └─ alchemy/        생플렌더 (폴더 이름은 첫 테마 때 그대로)
│     ├─ data.ts      생물 카드 90장 · 쌤 6명 · 토큰 이름
│     ├─ rules.ts     규칙 (시작, 검증, 적용, 화면용 상태)
│     ├─ bot.ts       컴퓨터 플레이어
│     ├─ rules.test.ts / balance.sim.ts
│     └─ ui/          게임 화면
├─ net/
│  ├─ firebase.ts     Firebase 연결 · 익명 로그인
│  ├─ firebaseRoom.ts 온라인 방 (자리, 게임 저장, 채팅, 접속 표시, 봇 담당)
│  └─ local.ts        봇과 연습하는 방 (네트워크 없음)
└─ ui/                홈, 대기실, 채팅, 규칙 페이지
database.rules.json   DB 보안 규칙 (Firebase 콘솔에 붙여 넣기)
```

## 새 게임 추가하기

1. `src/games/<게임이름>/` 에 `GameDefinition` (setup / validate / apply / view / activePlayer / result) 을 구현
2. 게임 화면 컴포넌트와 설정 컴포넌트를 만들기
3. `src/games/registry.ts` 와 `src/config.ts` 의 `GAMES` 에 등록

방 만들기, 접속, 재접속, 채팅, 봇 진행은 공통 코드가 알아서 해요.
