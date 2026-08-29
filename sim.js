(function () {
  const KEY = 'moth_paper_sim_v1';
  const START = 10000;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const API = window.MOTH_WATCHLIST_API || localStorage.getItem('moth_watchlist_api') || '';

  const COINS = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', tv: 'BTCUSDT', exchange: 'BINANCE', type: 'crypto' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', tv: 'ETHUSDT', exchange: 'BINANCE', type: 'crypto' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', tv: 'SOLUSDT', exchange: 'BINANCE', type: 'crypto' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', tv: 'XRPUSDT', exchange: 'BINANCE', type: 'crypto' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', tv: 'DOGEUSDT', exchange: 'BINANCE', type: 'crypto' }
  ];

  let prices = {};
  let tradeId = null;

  function loadSim() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { cash: START, holdings: {} };
    } catch {
      return { cash: START, holdings: {} };
    }
  }

  function saveSim(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  function money(n) {
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  function holdingsValue(s) {
    return Object.entries(s.holdings).reduce((sum, [id, amt]) => sum + amt * (prices[id]?.usd || 0), 0);
  }

  function watchlistPayload() {
    return COINS.map((c) => ({
      symbol: c.tv,
      exchange: c.exchange,
      type: c.type
    }));
  }

  function renderBalances() {
    const s = loadSim();
    const hv = holdingsValue(s);
    const cash = document.getElementById('cashBal');
    const hold = document.getElementById('holdBal');
    const tot = document.getElementById('totBal');
    if (cash) cash.textContent = money(s.cash);
    if (hold) hold.textContent = money(hv);
    if (tot) tot.textContent = money(s.cash + hv);
  }

  function renderWatch() {
    const body = document.getElementById('watchBody');
    if (!body) return;
    body.innerHTML = COINS.map((c) => {
      const p = prices[c.id] || {};
      const ch = p.usd_24h_change;
      const chCls = ch >= 0 ? 'text-emerald-400' : 'text-rose-400';
      const bag = (loadSim().holdings[c.id] || 0);
      return `<tr class="border-t border-white/10">
        <td class="px-4 py-3">${c.name} <span class="text-gray-500">${c.symbol}</span>
          <div class="text-[10px] text-gray-600">${c.exchange}:${c.tv}${bag ? ' · ' + bag.toFixed(6) + ' paper' : ''}</div></td>
        <td class="px-4 py-3">${p.usd != null ? money(p.usd) : '—'}</td>
        <td class="px-4 py-3 ${chCls}">${ch == null ? '—' : ch.toFixed(2) + '%'}</td>
        <td class="px-4 py-3"><button data-trade="${c.id}" class="text-[11px] uppercase tracking-[0.2em] text-moth-pink">Trade</button></td>
      </tr>`;
    }).join('');
    body.querySelectorAll('[data-trade]').forEach((btn) => {
      btn.onclick = () => openTrade(btn.dataset.trade);
    });
  }

  function mountSignup() {
    const table = document.getElementById('watchBody') && document.getElementById('watchBody').closest('.overflow-x-auto');
    if (!table || document.getElementById('simEmail')) return;
    table.insertAdjacentHTML('afterend', `
      <form id="watchSignup" class="mt-6 space-y-3 rounded-2xl border border-moth-pink/30 bg-black p-4">
        <p class="font-display text-[10px] uppercase tracking-[0.28em] text-moth-pink">Email required to keep this book</p>
        <input id="simEmail" type="email" required placeholder="you@domain.com" class="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-moth-pink" />
        <p class="text-[11px] text-gray-500">Saves BTCUSDT ETHUSDT SOLUSDT XRPUSDT DOGEUSDT on BINANCE with your email. Same payload as the Dynamo signup Lambda.</p>
        <button type="submit" class="w-full rounded-full bg-moth-pink py-3 font-display text-xs font-black uppercase tracking-[0.28em] text-black">Save watchlist</button>
        <p id="watchMsg" class="min-h-[1.25rem] text-center text-sm text-moth-pink"></p>
      </form>`);
    const saved = localStorage.getItem('moth_checkout_email') || '';
    if (saved) document.getElementById('simEmail').value = saved;
    document.getElementById('watchSignup').addEventListener('submit', submitWatchlist);
  }

  async function submitWatchlist(e) {
    e.preventDefault();
    const email = (document.getElementById('simEmail').value || '').trim().toLowerCase();
    const msg = document.getElementById('watchMsg');
    if (!EMAIL_RE.test(email)) {
      msg.textContent = 'A valid email is required.';
      return;
    }
    const watchlist = watchlistPayload();
    const payload = { email, watchlist };
    localStorage.setItem('moth_checkout_email', email);
    localStorage.setItem('moth_watchlist_v1', JSON.stringify(payload));

    if (!API) {
      msg.textContent = 'Saved on this device. Add your Lambda URL as MOTH_WATCHLIST_API to push to Dynamo.';
      return;
    }
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msg.textContent = data.error || 'Could not save your signup. Try again.';
        return;
      }
      msg.textContent = data.message || ('Signed up. ' + (data.count || watchlist.length) + ' symbols.');
    } catch {
      msg.textContent = 'Could not save your signup. Try again.';
    }
  }

  function openTrade(id) {
    const email = (document.getElementById('simEmail') && document.getElementById('simEmail').value || localStorage.getItem('moth_checkout_email') || '').trim();
    if (!EMAIL_RE.test(email)) {
      const msg = document.getElementById('watchMsg');
      if (msg) msg.textContent = 'Email required before you paper-trade.';
      document.getElementById('simEmail') && document.getElementById('simEmail').focus();
      return;
    }
    tradeId = id;
    const coin = COINS.find((c) => c.id === id);
    const modal = document.getElementById('tradeModal');
    document.getElementById('tradeTitle').textContent = 'Trade ' + coin.symbol;
    document.getElementById('tradePrice').textContent = 'Live: ' + (prices[id]?.usd != null ? money(prices[id].usd) : '—') + ' · paper only';
    document.getElementById('tradeAmt').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeTrade() {
    const modal = document.getElementById('tradeModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    tradeId = null;
  }

  function trade(side) {
    const amt = Number(document.getElementById('tradeAmt').value);
    const px = prices[tradeId]?.usd;
    if (!tradeId || !px || !(amt > 0)) return;
    const s = loadSim();
    const cost = amt * px;
    if (side === 'buy') {
      if (cost > s.cash) return alert('Not enough paper cash.');
      s.cash -= cost;
      s.holdings[tradeId] = (s.holdings[tradeId] || 0) + amt;
    } else {
      if ((s.holdings[tradeId] || 0) < amt) return alert('Not enough paper coins.');
      s.holdings[tradeId] -= amt;
      s.cash += cost;
    }
    saveSim(s);
    renderBalances();
    renderWatch();
    closeTrade();
  }

  async function fetchPrices() {
    const ids = COINS.map((c) => c.id).join(',');
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true';
    const res = await fetch(url);
    if (!res.ok) throw new Error('price fail');
    prices = await res.json();
    renderWatch();
    renderBalances();
  }

  const reset = document.getElementById('resetSim');
  if (reset) reset.onclick = () => { saveSim({ cash: START, holdings: {} }); renderBalances(); renderWatch(); };

  document.getElementById('buyBtn')?.addEventListener('click', () => trade('buy'));
  document.getElementById('sellBtn')?.addEventListener('click', () => trade('sell'));
  document.getElementById('closeTrade')?.addEventListener('click', closeTrade);

  if (document.getElementById('watchBody')) {
    mountSignup();
    fetchPrices().catch(() => {
      const body = document.getElementById('watchBody');
      if (body) body.innerHTML = '<tr><td class="px-4 py-6 text-gray-500" colspan="4">CoinGecko paused. Refresh in a minute.</td></tr>';
    });
    setInterval(() => fetchPrices().catch(() => {}), 30000);
    renderBalances();
  }
})();
