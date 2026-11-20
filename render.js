/* 小實人網站：把內容資料畫成各區塊的 HTML。
   網站開啟時（content.js）和產生 index.html 時共用同一份畫法。 */
(function (root) {
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yes = v => /^(是|y|yes|true|1|v|✓|✔)$/i.test(String(v ?? '').trim());
  const shown = r => !String(r['顯示'] ?? '').trim() || yes(r['顯示']);
  const list = rows => (rows || []).filter(shown);

  // 只允許 http(s) 網址或網站內的 images/ 圖片
  const safeUrl = v => {
    const s = String(v ?? '').trim();
    return /^https?:\/\//i.test(s) || /^images\/[\w\-./]+$/i.test(s) ? s : '';
  };

  // Google 雲端硬碟分享連結 → 可直接顯示的圖片網址
  const img = v => {
    const s = String(v ?? '').trim();
    const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
    return safeUrl(s);
  };

  // **粗體**
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 簡易排版：一行一段；「- 」開頭是項目清單；「1. 」開頭是編號清單；「## 」開頭是小標
  function rich(text) {
    const lines = String(text ?? '').replace(/\r/g, '').split('\n');
    let html = '', open = null;
    const close = () => { if (open) { html += `</${open}>`; open = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) { close(); continue; }
      let m;
      if ((m = l.match(/^[-・•]\s+(.*)$/))) {
        if (open !== 'ul') { close(); html += '<ul>'; open = 'ul'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = l.match(/^\d+[.、]\s*(.*)$/))) {
        if (open !== 'ol') { close(); html += '<ol>'; open = 'ol'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = l.match(/^##\s*(.*)$/))) {
        close(); html += `<h4>${inline(m[1])}</h4>`;
      } else {
        close(); html += `<p>${inline(l)}</p>`;
      }
    }
    close();
    return html;
  }

  const kv = rows => Object.fromEntries((rows || []).map(r => [String(r['欄位'] ?? '').trim(), r['內容'] ?? '']));

  const picture = (src, alt, cls = '', lazy = true) => {
    const u = img(src);
    return u ? `<img class="${cls}" src="${esc(u)}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">` : '';
  };

  const R = {
    hero(d) {
      const b = kv(d['基本資料']);
      const line1 = String(b['主標題第一行'] || '');
      const hl = String(b['主標題強調字'] || '').trim();
      const l1 = hl && line1.includes(hl)
        ? line1.split(hl).map(esc).join(`<em>${esc(hl)}</em>`)
        : esc(line1);
      const bg = img(b['主視覺圖片']) || 'images/hero.jpg';
      return `
        <div class="hero-bg" style="background-image:url('${esc(bg)}')" aria-hidden="true"></div>
        <div class="hero-inner wrap">
          <p class="hero-kicker">實人實驗教育．低年級學習群</p>
          <h1><span>${l1}</span><span>${esc(b['主標題第二行'])}</span></h1>
          <p class="hero-lead">${esc(b['歡迎詞'])}</p>
          <ul class="hero-tags"><li>6–8 歲</li><li>混齡共學</li><li>蒙特梭利 × 原型教育</li></ul>
          <div class="hero-cta">
            <a class="btn btn-sun" href="#contact">留下資料・預約體驗</a>
            <a class="btn btn-ghost" href="#course">看課程規劃</a>
          </div>
        </div>`;
    },

    about(d) {
      const b = kv(d['基本資料']);
      const photo = picture(b['籌備照片'], '孩子們坐在田邊一起休息', 'about-photo');
      const steps = list(d['時程']).map((r, i) => `
          <li><span class="dot">${i + 1}</span><b>${esc(r['時間'])}</b><span>${esc(r['階段'])}</span></li>`).join('');
      return `
        <div class="wrap about-grid">
          <div class="about-text">
            <p class="eyebrow">ABOUT</p>
            <h2>${esc(b['籌備標題'])}</h2>
            ${rich(b['籌備內文'])}
            <h3>${esc(b['緣起標題'])}</h3>
            ${rich(b['緣起內文'])}
          </div>
          ${photo ? `<figure class="about-figure">${photo}</figure>` : ''}
        </div>
        <div class="timeline-band">
          <div class="wrap">
            <h3 class="timeline-title">時程規劃</h3>
            <ol class="timeline">${steps}</ol>
          </div>
        </div>`;
    },

    record(d) {
      const items = list(d['經歷']).map(r => `
          <li><span class="rec-year">${esc(r['年份'])}</span><div><b>${esc(r['標題'])}</b><p>${inline(r['內容'])}</p></div></li>`).join('');
      const photos = list(d['經歷照片']).map(r => {
        const p = picture(r['圖片'], r['說明']);
        const link = safeUrl(r['連結']);
        const cap = `<figcaption>${esc(r['說明'])}</figcaption>`;
        return p ? `<figure>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${p}</a>` : p}${cap}</figure>` : '';
      }).join('');
      const links = list(d['相關連結']).map(r => {
        const u = safeUrl(r['網址']);
        return u ? `<a class="btn btn-line" href="${esc(u)}" target="_blank" rel="noopener">${esc(r['文字'])} ↗</a>` : '';
      }).join('');
      return `
        <div class="wrap">
          <p class="eyebrow">RECORD</p>
          <h2>實人實驗教育經歷與活動</h2>
          <div class="record-grid">
            <ul class="record-list">${items}</ul>
            <div class="record-photos">${photos}</div>
          </div>
          ${links ? `<div class="record-links">${links}</div>` : ''}
        </div>`;
    },

    core(d) {
      const blocks = list(d['教育核心']).map((r, i) => `
          <article class="core-item${i % 2 ? ' flip' : ''}">
            <figure>${picture(r['圖片'], r['標題'])}</figure>
            <div class="core-body">
              <span class="core-no">0${i + 1}</span>
              <h3>${esc(r['標題'])}</h3>
              ${rich(r['內文'])}
            </div>
          </article>`).join('');
      return `
        <div class="wrap">
          <p class="eyebrow">PHILOSOPHY</p>
          <h2>教育核心與理念</h2>
          ${blocks}
        </div>`;
    },

    course(d) {
      const b = kv(d['基本資料']);
      const theory = list(d['課程理論']).map(r => `
          <article class="theory">
            ${picture(r['圖片'], r['名稱'])}
            <h4>${esc(r['名稱'])}</h4>
            <p>${inline(r['說明'])}</p>
          </article>`).join('');
      const domains = list(d['課程領域']).map(r => `
          <article class="domain">
            <div class="domain-img">${picture(r['圖片'], r['名稱'])}</div>
            <div class="domain-body">
              <h4>${esc(r['名稱'])}</h4>
              ${r['副標'] ? `<p class="domain-sub">${esc(r['副標'])}</p>` : ''}
              <p>${inline(r['簡介'])}</p>
              ${String(r['內容'] || '').trim() ? `<details><summary>看學習內容</summary><div class="rich">${rich(r['內容'])}</div></details>` : ''}
            </div>
          </article>`).join('');
      const banner = picture(b['課程照片'], '老師陪孩子動手做結構', 'course-banner');
      return `
        <div class="wrap">
          <p class="eyebrow">CURRICULUM</p>
          <h2>課程設計與規劃</h2>
          <div class="course-intro${banner ? '' : ' solo'}">
            <div>
              <h3>課程核心</h3>
              ${rich(b['課程核心說明'])}
            </div>
            ${banner ? `<figure>${banner}</figure>` : ''}
          </div>
          <div class="theory-grid">${theory}</div>
          <h3 class="domain-title">核心領域課程</h3>
          <div class="domain-grid">${domains}</div>
        </div>`;
    },

    faq(d) {
      const qs = list(d['常見問題']).map((r, i) => `
          <details class="qa"${i === 0 ? ' open' : ''}>
            <summary><span class="q">Q${i + 1}</span>${esc(r['問題'])}</summary>
            <div class="rich">${rich(r['答案'])}</div>
          </details>`).join('');
      return `
        <div class="wrap narrow">
          <p class="eyebrow">Q &amp; A</p>
          <h2>常見問題</h2>
          ${qs}
        </div>`;
    },

    contact(d) {
      const b = kv(d['基本資料']);
      const form = safeUrl(b['報名表單網址']);
      const embed = form ? form.replace(/\?.*$/, '') + '?embedded=true' : '';
      return `
        <div class="wrap contact-grid">
          <div class="contact-text">
            <p class="eyebrow">CONTACT</p>
            <h2>聯絡與交流</h2>
            ${rich(b['聯絡說明'])}
            ${form ? `<a class="btn btn-sun" href="${esc(form)}" target="_blank" rel="noopener">在新視窗開啟表單 ↗</a>` : ''}
          </div>
          ${embed ? `<div class="form-frame"><iframe src="${esc(embed)}" title="小實人聯絡與交流表單" loading="lazy">載入中…</iframe></div>` : ''}
        </div>`;
    },
  };

  const API = { R, rich, esc, kv, list, img };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.XSR = API;
})(this);
