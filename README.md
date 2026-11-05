# 생교 보드게임

친구들과 링크 하나로 바로 하는 브라우저 보드게임 모음.
첫 게임은 **생교 연금공방**이에요. 정수를 모아 레시피를 익히고, 익힌 레시피로 더 비싼 레시피를 사서 점수를 쌓는 엔진 빌딩 게임이에요 (2~4명, 30~45분).

- 로그인 없음: 닉네임만 정하면 끝
- 방 만들기 → 초대 링크를 카톡으로 보내기 → 같이 하기
- 사람이 모자라면 봇을 넣을 수 있고, 혼자 봇과 연습할 수도 있어요
- 휴대폰에서도 할 수 있어요

## 배포 (GitHub Pages)

처음 한 번만 하면 돼요.

1. GitHub 저장소 → **Settings → Pages**
2. **Build and deployment → Source** 를 **GitHub Actions** 로 바꾸기
3. `main` 브랜치에 올리면(push) 자동으로 테스트·빌드·배포돼요. **Actions** 탭에서 진행 상황을 볼 수 있어요.

주소는 `https://<GitHub 아이디>.github.io/boardgame/` 예요.

## 어떻게 동작하나요?

GitHub Pages는 파일만 올려 두는 곳이라 게임 서버를 돌릴 수 없어요. 그래서 **방장의 브라우저가 서버 역할**을 해요.

```
 친구 브라우저 ─┐
 친구 브라우저 ─┼─ WebRTC 직접 연결 ─→ 방장 브라우저 (규칙 판정 · 게임 상태 보관 · 봇 진행)
 친구 브라우저 ─┘
                 (서로를 처음 찾을 때만 PeerJS 무료 중계 서버 0.peerjs.com 을 씀)
```

- 친구들은 "이 카드 살래" 같은 **행동만** 보내고, 방장 브라우저가 규칙을 검사해서 결과를 모두에게 보내요.
- 덱 순서나 몰래 예약한 카드는 각자에게 가려서 보내요.
- **방장은 게임 중에 창을 닫으면 안 돼요.** 새로고침은 괜찮아요. 게임이 그대로 복구되고 친구들도 자동으로 다시 붙어요.
- 친구도 새로고침하거나 잠깐 끊겨도 자기 자리로 돌아와요.

### 연결이 안 될 때

대부분의 집 와이파이와 휴대폰 데이터에서는 바로 연결돼요. 일부 회사·학교망이나 통신사 환경에서는 브라우저끼리 직접 연결이 막힐 수 있어요. 이럴 땐 TURN 서버(연결을 대신 전달해 주는 서버)가 필요해요. 무료 TURN 서비스에 가입한 뒤, 저장소 **Settings → Secrets and variables → Actions → Variables** 에 아래 값을 넣고 다시 배포하면 돼요 (`deploy.yml` 이 이미 이 값을 읽도록 되어 있어요).

| 이름 | 예시 |
|---|---|
| `VITE_TURN_URLS` | `turn:example.com:3478,turns:example.com:443` |
| `VITE_TURN_USERNAME` | 서비스에서 받은 사용자 이름 |
| `VITE_TURN_CREDENTIAL` | 서비스에서 받은 비밀번호 |

## 직접 실행해 보기 (개발자용)

Node.js 22 이상이 필요해요.

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173/boardgame/)
npm test           # 규칙 테스트
npm run sim        # 봇끼리 수천 판 돌려서 밸런스 보기
npm run build      # 배포용 파일 만들기 (dist/)
```

## 폴더 구조

```
src/
├─ engine/            모든 게임 공통 규격 (GameDefinition), 시드 난수
├─ games/
│  ├─ registry.ts     게임 목록 (새 게임은 여기에 등록)
│  └─ alchemy/        생교 연금공방
│     ├─ data.ts      카드 85장 · 후원자 10명 · 정수 이름
│     ├─ rules.ts     규칙 (시작, 검증, 적용, 화면용 상태)
│     ├─ bot.ts       컴퓨터 플레이어
│     ├─ rules.test.ts / balance.sim.ts
│     └─ ui/          게임 화면
├─ net/               방 만들기 · P2P 통신 (host.ts = 방장, guest.ts = 손님)
└─ ui/                홈, 대기실, 채팅, 규칙 페이지
```

## 새 게임 추가하기

1. `src/games/<게임이름>/` 에 `GameDefinition` (setup / validate / apply / view / activePlayer / result) 을 구현
2. 게임 화면 컴포넌트와 설정 컴포넌트를 만들기
3. `src/games/registry.ts` 와 `src/config.ts` 의 `GAMES` 에 등록

방 만들기, 접속, 재접속, 채팅, 봇 진행은 공통 코드가 알아서 해요.
