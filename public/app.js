const sectors = [
  { name: '반도체', change: 4.82, strength: 94 },
  { name: '전력 · 에너지', change: 3.17, strength: 86 },
  { name: '방산', change: 2.64, strength: 78 },
  { name: '바이오', change: 2.31, strength: 71 },
  { name: '로봇 · AI', change: 1.98, strength: 66 },
];

const stocks = [
  { name: 'SK하이닉스', code: '000660', market: 'KOSPI', price: 183400, change: 6.38, volume: '8,421억', strength: 98, icon: 'SK' },
  { name: '한미반도체', code: '042700', market: 'KOSPI', price: 142800, change: 8.02, volume: '3,872억', strength: 94, icon: '한' },
  { name: 'HD현대일렉트릭', code: '267260', market: 'KOSPI', price: 287500, change: 5.12, volume: '2,651억', strength: 89, icon: 'HD' },
  { name: '알테오젠', code: '196170', market: 'KOSDAQ', price: 176300, change: 4.44, volume: '1,984억', strength: 84, icon: '알' },
  { name: '에코프로비엠', code: '247540', market: 'KOSDAQ', price: 224000, change: 3.71, volume: '1,723억', strength: 79, icon: 'E' },
];

const formatPrice = (value) => new Intl.NumberFormat('ko-KR').format(value);

function renderSectors() {
  document.querySelector('#sectorGrid').innerHTML = sectors.map((sector, index) => `
    <article class="sector-card">
      <span class="sector-rank">0${index + 1}</span>
      <h3>${sector.name}</h3>
      <span class="change">+${sector.change.toFixed(2)}%</span>
      <div class="strength"><div class="strength-label"><span>주도 강도</span><b>${sector.strength}</b></div><div class="strength-bar"><i style="--strength:${sector.strength}%"></i></div></div>
    </article>`).join('');
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
      renderStocks(document.querySelector('.tabs button.active').dataset.market);
    } else {
      label.textContent = '샘플 데이터';
      badge.textContent = 'DEMO';
    }
  } catch {
    document.querySelector('#connectionLabel').textContent = '연결 확인 필요';
    document.querySelector('#connectionMode').textContent = 'OFF';
  }
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

document.querySelector('#refreshButton').addEventListener('click', (event) => {
  event.currentTarget.classList.add('loading');
  updateClock();
  const toast = document.querySelector('#toast');
  toast.classList.add('show');
  setTimeout(() => { event.currentTarget.classList.remove('loading'); toast.classList.remove('show'); }, 900);
});

renderSectors();
renderStocks();
renderSparklines();
updateClock();
connectToss();
saveAndLoadHistory();
setInterval(updateClock, 3000);
setInterval(connectToss, 5000);
