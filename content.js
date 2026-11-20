// 小實人網站 · 從 Google 試算表讀取內容
// ------------------------------------------------------------
// 只要改這一行：貼上 Google 試算表網址中 /d/ 和 /edit 之間那一串 ID。
// 留空白時，網站會直接顯示寫在 index.html 裡的內容。
const SHEET_ID = '1_5w-tPzNl8ztCKC5h06_P-U1kvfKSETQYUB2jLoi8Sw';
// ------------------------------------------------------------

(() => {
  if (!SHEET_ID || !window.XSR) return;
  const { R } = window.XSR;

  const url = name =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}&_=${Date.now()}`;

  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim());
    return rows
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
      .filter(r => Object.entries(r).some(([k, v]) => k !== '顯示' && v));
  }

  async function load(name) {
    const res = await fetch(url(name), { cache: 'no-store' });
    if (!res.ok) throw new Error(name + ' ' + res.status);
    const t = await res.text();
    if (/^\s*</.test(t)) throw new Error(name + '：試算表沒有開放「知道連結的任何人」檢視');
    return parseCSV(t);
  }

  // 每個區塊需要哪些分頁
  const NEED = {
    hero: ['基本資料'],
    about: ['基本資料', '時程'],
    core: ['教育核心'],
    course: ['基本資料', '課程理論', '課程領域'],
    record: ['經歷', '經歷照片', '相關連結'],
    faq: ['常見問題'],
    contact: ['基本資料'],
  };
  const tabs = [...new Set(Object.values(NEED).flat())];

  Promise.allSettled(tabs.map(load)).then(results => {
    const data = {}, failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') data[tabs[i]] = r.value;
      else { failed.push(tabs[i]); console.warn('[小實人] 讀取失敗，顯示網頁原本內容：', r.reason.message); }
    });
    // 某個分頁讀不到時，用到它的區塊維持網頁原本內容
    Object.entries(NEED).forEach(([id, need]) => {
      if (need.some(t => failed.includes(t))) return;
      const el = document.querySelector(`[data-section="${id}"]`);
      if (!el) return;
      try { el.innerHTML = R[id](data); }
      catch (e) { console.warn('[小實人] 區塊畫不出來，保留原本內容：', id, e); }
    });
  });
})();
