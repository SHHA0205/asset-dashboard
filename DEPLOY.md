# 클라우드 배포 가이드 (어디서나 접속)

Render(무료)에 배포하면 PC/모바일 어디서나 `https://xxxx.onrender.com` 으로 접속할 수 있습니다.

## 사전 준비

- [GitHub](https://github.com) 계정
- [Render](https://render.com) 계정 (GitHub 연동)

## 1단계 — GitHub에 코드 올리기

프로젝트 폴더에서 명령 프롬프트(cmd) 실행:

```bat
cd C:\Users\KR\projects\asset-dashboard

git init
git add .
git commit -m "Asset dashboard initial"
```

GitHub에서 새 저장소(repository) 생성 후:

```bat
git remote add origin https://github.com/YOUR_USERNAME/asset-dashboard.git
git branch -M main
git push -u origin main
```

`YOUR_USERNAME`을 본인 GitHub 아이디로 바꾸세요.

## 2단계 — Render 배포

1. https://dashboard.render.com 접속
2. **New +** → **Web Service**
3. GitHub 저장소 `asset-dashboard` 연결
4. 설정:

| 항목 | 값 |
|------|-----|
| Name | asset-dashboard |
| Region | Singapore (한국에서 가장 가까움) |
| Branch | main |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Plan | Free |

5. **Environment Variables** 추가:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `ACCESS_PASSWORD` | (선택) 사이트 전체 2차 비밀번호 |
| `JWT_SECRET` | **필수** 랜덤 긴 문자열 (로그인 세션 암호화) |

6. **Create Web Service** 클릭
7. 5~10분 후 배포 완료 → URL 확인 (예: `https://asset-dashboard-xxxx.onrender.com`)

## 3단계 — 접속

- PC/모바일 크롬에서 배포 URL 접속
- 비밀번호 입력 창이 나오면 `ACCESS_PASSWORD` 값 입력
- **홈 화면에 추가**하면 앱처럼 사용 가능

## "Application loading" 이 계속 나올 때

### 1. 잠시 대기 (무료 플랜)
- 15분 미사용 후 첫 접속 시 **30~60초** 걸릴 수 있음
- Render 기본 화면이 "Application loading" 으로 표시됨

### 2. Render 설정 확인
Render 대시보드 → 해당 서비스 → **Settings**:

| 항목 | 올바른 값 |
|------|-----------|
| Type | **Web Service** (Static Site 아님!) |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/ping` |

### 3. 로그 확인
Render → **Logs** 탭에서 오류 확인:
- `dist/index.html not found` → 빌드 실패
- `EADDRINUSE` → 포트 충돌 (드묾)
- `Application failed to respond` → 헬스체크 실패

### 4. 코드 수정 후 재배포
```bat
git add .
git commit -m "fix render deploy"
git push
```

### 5. 비밀번호
`ACCESS_PASSWORD` 설정 시 접속하면 브라우저 로그인 창이 뜸.
- 사용자명: 아무거나 (예: `user`)
- 비밀번호: `ACCESS_PASSWORD` 에 설정한 값

## 무료 플랜 참고

- 15분 미사용 시 서버가 sleep → 첫 접속 시 30~60초 대기 가능
- 계좌/종목 데이터는 **각 기기 브라우저에 따로 저장** (IndexedDB)
- PC와 폰 데이터는 자동 동기화되지 않음

## 코드 수정 후 재배포

```bat
git add .
git commit -m "update"
git push
```

Render가 자동으로 다시 배포합니다.

## PC / 모바일 동기화 (로그인)

1. PC와 모바일 **같은 URL** 접속 (Render 배포 주소)
2. **회원가입** → 아이디/비밀번호 설정 (최초 1회)
3. PC에서 입력한 계좌/종목이 **자동 동기화** (2초 후 서버 저장)
4. 모바일에서 **같은 아이디로 로그인** → 동일 데이터 표시

### 보안
- 비밀번호: bcrypt 해시 저장 (평문 저장 안 함)
- 세션: JWT 토큰 (30일)
- 전송: HTTPS (Render 기본 제공)
- `JWT_SECRET` 환경변수 반드시 설정

### 로컬 전용
- "로그인 없이 사용" 선택 시 이 기기만 저장 (기존 방식)

## 로컬 vs 클라우드

| | 로컬 (start.bat) | 클라우드 (Render) |
|--|------------------|-------------------|
| 접속 | localhost:3001 | https://xxx.onrender.com |
| PC 필요 | 항상 켜져 있어야 함 | 불필요 |
| 모바일 | 같은 Wi-Fi만 | 어디서나 |
| 데이터 | 이 PC 브라우저 | 각 기기별 별도 |