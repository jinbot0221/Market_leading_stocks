const sectors = [
  { name: '반도체', change: 4.82, strength: 94 },
  { name: '전력 · 에너지', change: 3.17, strength: 86 },
  { name: '방산', change: 2.64, strength: 78 },
  { name: '바이오', change: 2.31, strength: 71 },
  { name: '로봇 · AI', change: 1.98, strength: 66 },
  { name: '자동차', change: 1.84, strength: 64 },
  { name: '조선', change: 1.72, strength: 62 },
  { name: '은행', change: 1.46, strength: 59 },
  { name: '증권', change: 1.32, strength: 57 },
  { name: '보험', change: 1.18, strength: 55 },
  { name: '2차전지', change: 1.04, strength: 53 },
  { name: '화학', change: 0.91, strength: 51 },
  { name: '철강 · 금속', change: 0.76, strength: 49 },
  { name: '기계 · 장비', change: 0.63, strength: 47 },
  { name: '건설', change: 0.51, strength: 45 },
  { name: '통신', change: 0.44, strength: 43 },
  { name: '인터넷', change: 0.38, strength: 41 },
  { name: '게임', change: 0.24, strength: 39 },
  { name: '엔터 · 미디어', change: 0.12, strength: 37 },
  { name: '유통', change: 0.06, strength: 35 },
  { name: '화장품', change: -0.08, strength: 33 },
  { name: '음식료', change: -0.17, strength: 31 },
  { name: '운송', change: -0.26, strength: 29 },
  { name: '항공', change: -0.34, strength: 27 },
  { name: '여행 · 레저', change: -0.43, strength: 25 },
  { name: '의류 · 소비재', change: -0.52, strength: 23 },
  { name: '교육', change: -0.64, strength: 21 },
  { name: '부동산 · 리츠', change: -0.71, strength: 19 },
  { name: '농업 · 비료', change: -0.83, strength: 17 },
  { name: '종이 · 목재', change: -0.96, strength: 15 },
];

const stocks = [
  { name: 'SK하이닉스', code: '000660', market: 'KOSPI', price: 183400, change: 6.38, volume: '8,421억', strength: 98, icon: 'SK' },
  { name: '한미반도체', code: '042700', market: 'KOSPI', price: 142800, change: 8.02, volume: '3,872억', strength: 94, icon: '한' },
  { name: 'HD현대일렉트릭', code: '267260', market: 'KOSPI', price: 287500, change: 5.12, volume: '2,651억', strength: 89, icon: 'HD' },
  { name: '알테오젠', code: '196170', market: 'KOSDAQ', price: 176300, change: 4.44, volume: '1,984억', strength: 84, icon: '알' },
  { name: '에코프로비엠', code: '247540', market: 'KOSDAQ', price: 224000, change: 3.71, volume: '1,723억', strength: 79, icon: 'E' },
];

const formatPrice = (value) => new Intl.NumberFormat('ko-KR').format(value);

function renderSectors(filter = 'ALL') {
  const visible = filter === 'STRONG' ? sectors.filter((sector) => sector.strength >= 60)
    : filter === 'UP' ? sectors.filter((sector) => sector.change > 0) : sectors;
  document.querySelector('#sectorGrid').innerHTML = visible.map((sector) => {
    const index = sectors.indexOf(sector);
    const changeClass = sector.change >= 0 ? 'up' : 'down';
    const changeSign = sector.change >= 0 ? '+' : '';
    const sizeClass = sector.strength >= 85 ? 'flow-mega'
      : sector.strength >= 70 ? 'flow-large'
        : sector.strength >= 50 ? 'flow-medium' : 'flow-normal';
    return `
    <article class="sector-card ${sizeClass}" style="--flow:${sector.strength};--flow-opacity:${(sector.strength / 500).toFixed(3)}" aria-label="${sector.name}, 수급 집중도 ${sector.strength}">
      <span class="sector-rank">${String(index + 1).padStart(2, '0')}</span>
      <div class="sector-title"><h3>${sector.name}</h3><span class="flow-badge">수급 ${sector.strength}</span></div>
      <span class="change ${changeClass}">${changeSign}${sector.change.toFixed(2)}%</span>
      <div class="strength"><div class="strength-label"><span>수급 집중도</span><b>${sector.strength}</b></div><div class="strength-bar"><i style="--strength:${sector.strength}%"></i></div></div>
    </article>`;
  }).join('');
  document.querySelector('#visibleSectorCount').textContent = `${visible.length}개`;
}

function renderStocks(market = 'ALL') {
  const filtered = market === 'ALL' ? stocks : stocks.filter((stock) => stock.market === market);
  document.querySelector('#stockTable').innerHTML = filtered.map((stock, index) => `
    <tr>
      <td><div class="stock-name"><span>${index + 1}</span><span class="ticker-icon">${stock.icon}</span><span><b>${stock.name}</b><small>${stock.code} · ${stock.market}</small></span></div></td>
      <td>${formatPrice(stock.price)}</td><td class="up">+${stock.change.toFixed(2)}%</td><td>${stock.volume}</td><td><span class="strength-pill">${stock.strength}</span></td>
    </tr>`).join('');
}

function renderSparklines() {
  document.querySelectorAll('.sparkline').forEach((element) => {
    const values = element.dataset.series.split(',').map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const points = values.map((value, i) => `${(i / (values.length - 1)) * 100},${21 - ((value - min) / (max - min)) * 19}`).join(' ');
    element.innerHTML = `<svg viewBox="0 0 100 23" preserveAspectRatio="none"><polyline points="${points}" /></svg>`;
  });
}

function updateClock() {
  document.querySelector('#updatedAt').textContent = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
}

async function connectToss() {
  const symbols = stocks.map((stock) => stock.code).join(',');
  try {
    const response = await fetch(`/api/toss/prices?symbols=${symbols}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const label = document.querySelector('#connectionLabel');
    const badge = document.querySelector('#connectionMode');
    if (data.mode === 'live') {
      data.result.forEach((quote) => {
        const stock = stocks.find((item) => item.code === quote.symbol);
        if (stock) stock.price = Number(quote.lastPrice);
      });
      label.textContent = '토스증권 실시간';
      badge.textContent = 'LIVE';
      document.querySelector('#connectionStatus').title = '토스증권 Open API에 정상 연결되었습니다.';
      renderStocks(document.querySelector('.tabs button.active').dataset.market);
      document.querySelector('#refreshStatus').textContent = `${new Date().toLocaleTimeString('ko-KR')} 갱신 완료`;
    } else {
      label.textContent = '샘플 데이터';
      badge.textContent = 'DEMO';
      document.querySelector('#connectionStatus').title = 'TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 .env에 입력해 주세요.';
      document.querySelector('#refreshStatus').textContent = 'API 인증정보 필요';
    }
  } catch (error) {
    const reason = error.message || '알 수 없는 오류';
    document.querySelector('#connectionLabel').textContent = '토스 연결 오류';
    document.querySelector('#connectionMode').textContent = 'OFF';
    document.querySelector('#connectionStatus').title = reason;
    document.querySelector('#refreshStatus').textContent = `${reason} · 1초 후 재시도`;
  }
}

async function updateRecorderStatus() {
  try {
    const [statusResponse, dataResponse] = await Promise.all([fetch('/api/recorder/status'), fetch('/api/intraday')]);
    const status = await statusResponse.json();
    const day = await dataResponse.json();
    const labels = {
      recording: '기록 중', 'outside-hours': '기록 시간 대기',
      'credentials-required': 'API 인증 필요', error: '기록 오류', waiting: '시작 대기',
    };
    document.querySelector('#recorderState').textContent = labels[status.state] || status.state;
    document.querySelector('#snapshotCount').textContent = `오늘 ${day.snapshots.length}개 저장`;
  } catch {
    document.querySelector('#recorderState').textContent = '상태 확인 실패';
  }
}

function startAutoRefresh() {
  const refresh = async () => {
    await Promise.all([connectToss(), updateRecorderStatus()]);
    window.setTimeout(refresh, 1000);
  };
  refresh();
}

function renderHistory(history) {
  const chart = document.querySelector('#historyChart');
  document.querySelector('#historyCount').textContent = `${history.length}일 기록`;
  if (!history.length) return;
  const recent = history.slice(-14);
  chart.innerHTML = recent.map((day) => {
    const leader = [...day.sectors].sort((a, b) => b.strength - a.strength)[0];
    return `<div class="history-day" title="${day.date} ${leader.name} ${leader.strength}"><b style="--height:${leader.strength}%"><i>${leader.strength}</i></b><span>${day.date.slice(5).replace('-', '.')}</span><em>${leader.name}</em></div>`;
  }).join('');
}

async function saveAndLoadHistory() {
  try {
    await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectors }) });
    const response = await fetch('/api/history');
    const { history } = await response.json();
    renderHistory(history);
  } catch {
    document.querySelector('#historyChart').innerHTML = '<p>기록 서버에 연결할 수 없습니다.</p>';
  }
}

document.querySelectorAll('.tabs button').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.tabs button.active').classList.remove('active');
  button.classList.add('active');
  renderStocks(button.dataset.market);
}));

document.querySelectorAll('.sector-filter button').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.sector-filter button.active').classList.remove('active');
  button.classList.add('active');
  renderSectors(button.dataset.sectorFilter);
}));

document.querySelector('#refreshButton').addEventListener('click', async (event) => {
  event.currentTarget.classList.add('loading');
  updateClock();
  const toast = document.querySelector('#toast');
  await Promise.all([connectToss(), updateRecorderStatus()]);
  toast.textContent = document.querySelector('#connectionMode').textContent === 'LIVE'
    ? '최신 데이터를 불러왔습니다.' : '연결 상태를 확인해 주세요.';
  toast.classList.add('show');
  setTimeout(() => { event.currentTarget.classList.remove('loading'); toast.classList.remove('show'); }, 900);
});

renderSectors();
renderStocks();
renderSparklines();
updateClock();
saveAndLoadHistory();
startAutoRefresh();
setInterval(updateClock, 3000);
