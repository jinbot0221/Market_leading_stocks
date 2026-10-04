# Market Flow

국내 주식 시장에서 거래대금과 상승 강도가 집중되는 **주도 섹터와 주도주**를 모바일에서도 빠르게 확인할 수 있는 로컬 웹 대시보드입니다.

반도체, 에너지, 방산, 바이오부터 금융, 소비재, 운송, 리츠까지 국내 시장의 주요 30개 섹터를 모두 표시합니다. **전체 · 강세 · 상승** 필터로 원하는 범위를 빠르게 확인할 수 있으며 모바일에서도 일부 섹터를 숨기지 않습니다.

## 실행 방법

Node.js 18 이상에서 별도 패키지 설치 없이 실행됩니다.

```bash
npm start
```

- 내 컴퓨터: `http://localhost:4173`
- 같은 Wi-Fi의 휴대폰: `http://내-PC의-IP:4173`

PC의 내부 IP는 Windows에서 `ipconfig`, macOS/Linux에서 `ifconfig` 또는 `ip addr`로 확인하세요. 방화벽에서 4173 포트의 인바운드 연결을 허용해야 할 수 있습니다.

## 데이터 연결 안내

### `TOSS_CLIENT_ID`는 어디서 받나요?

`TOSS_CLIENT_ID`는 프로젝트 안에 원래 들어 있는 값이 아니라 **토스증권에서 본인이 직접 발급받는 API 인증값**입니다.

1. PC 브라우저에서 [토스증권 WTS](https://www.tossinvest.com/)에 로그인합니다.
2. **설정 → Open API**로 이동합니다.
3. 클라이언트를 등록하고 `Client ID`와 `Client Secret`을 발급받습니다.
4. 같은 화면 아래의 **허용 IP 관리**에 이 서버가 사용하는 공인 IP를 등록합니다.

### 이 프로젝트의 어디에 입력하나요?

프로젝트 최상위 폴더(`/workspace/Market_leading_stocks`)에서 예제 파일을 `.env`로 복사합니다.

```bash
cp .env.example .env
```

그다음 `.env`를 메모장이나 VS Code로 열어 발급받은 실제 값을 입력합니다.

```dotenv
TOSS_CLIENT_ID=토스증권에서_발급받은_Client_ID
TOSS_CLIENT_SECRET=토스증권에서_발급받은_Client_Secret
```

저장한 다음 서버를 실행하면 `.env`가 자동으로 로드됩니다.

```bash
npm start
```

`.env`는 Git에서 제외되어 있으며, Client Secret은 다른 사람에게 전달하거나 GitHub에 올리면 안 됩니다.

환경 변수를 직접 지정하는 기존 방식도 사용할 수 있습니다.

```bash
TOSS_CLIENT_ID="발급받은_Client_ID" \
TOSS_CLIENT_SECRET="발급받은_Client_Secret" \
npm start
```

서버가 OAuth 2.0 액세스 토큰을 발급·캐시하고 주요 종목의 현재가를 5초마다 갱신합니다. 이미 발급한 토큰을 직접 지정하려면 `TOSS_ACCESS_TOKEN="토큰" npm start`도 사용할 수 있습니다. 인증정보와 토큰은 브라우저로 전달되지 않고 로컬 서버에서만 사용됩니다. 인증값이 없으면 화면 우측 상단에 `DEMO`가 표시됩니다.

## 날짜별 기록

대시보드를 열면 그날의 섹터 순위와 주도 강도를 `data/history.json`에 자동 저장합니다. 같은 날짜에 다시 접속하면 해당 날짜의 기록을 최신 값으로 갱신하며 최대 365일을 유지합니다. 화면의 **주도 섹터 흐름**에서 최근 14일의 1위 섹터 변화를 확인할 수 있습니다.

기록 경로는 필요할 때 다음과 같이 변경할 수 있습니다.

```bash
HISTORY_FILE="/원하는/경로/history.json" npm start
```

> 현재 섹터 분류 및 강도는 샘플 산식입니다. 운영 전에는 토스증권의 종목·랭킹·실시간 체결 데이터를 섹터 마스터와 결합해 산출하도록 교체해야 합니다. API 키와 액세스 토큰은 브라우저 코드나 Git에 저장하지 마세요.

## 테스트

```bash
npm test
```
