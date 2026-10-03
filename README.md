# Market Flow

국내 주식 시장에서 거래대금과 상승 강도가 집중되는 **주도 섹터와 주도주**를 모바일에서도 빠르게 확인할 수 있는 로컬 웹 대시보드입니다.

## 실행 방법

Node.js 18 이상에서 별도 패키지 설치 없이 실행됩니다.

```bash
npm start
```

- 내 컴퓨터: `http://localhost:4173`
- 같은 Wi-Fi의 휴대폰: `http://내-PC의-IP:4173`

PC의 내부 IP는 Windows에서 `ipconfig`, macOS/Linux에서 `ifconfig` 또는 `ip addr`로 확인하세요. 방화벽에서 4173 포트의 인바운드 연결을 허용해야 할 수 있습니다.

## 데이터 연결 안내

토스증권 WTS의 **설정 → Open API**에서 발급한 Client ID와 Client Secret을 환경 변수로 지정하면 서버가 OAuth 2.0 액세스 토큰을 발급·캐시하고 주요 종목의 현재가를 5초마다 갱신합니다. 먼저 Open API 설정에서 이 서버가 사용하는 공인 IP도 허용해야 합니다. 인증값을 지정하지 않으면 화면 우측 상단에 `DEMO`가 표시되고 샘플 데이터로 동작합니다.

```bash
TOSS_CLIENT_ID="발급받은_Client_ID" \
TOSS_CLIENT_SECRET="발급받은_Client_Secret" \
npm start
```

이미 발급한 토큰을 직접 지정하려면 `TOSS_ACCESS_TOKEN="토큰" npm start`도 사용할 수 있습니다. 인증정보와 토큰은 브라우저로 전달되지 않고 로컬 서버에서만 사용됩니다. 현재가는 토스증권의 `GET /api/v1/prices`를 사용합니다.

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
