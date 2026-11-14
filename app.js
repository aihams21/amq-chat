/* عُمق / AMQ — منطق الواجهة */

const MODELS = [
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', ctx: 1_000_000, free: true },
  { id: 'inclusionai/ling-3.2-flash:free',        name: 'Ling 3.2 Flash',        ctx: 1_048_576, free: true },
  { id: 'nvidia/nemotron-3.5-lightning:free',     name: 'Nemotron 3.5 Lightning', ctx: 1_000_000, free: true },
  { id: 'thinkingmachines/inkling-2-small:free',  name: 'Inkling 2 Small',       ctx: 1_048_576, free: true },
  { id: 'particle-ai/particle-1:free',            name: 'Particle 1',            ctx: 1_048_576, free: true },
  { id: 'google/gemma-4-31b-it:free',             name: 'Gemma 4 31B',           ctx: 262_144, free: true },
  { id: 'google/gemma-4-26b-a4b-it:free',         name: 'Gemma 4 26B A4B',       ctx: 262_144, free: true },
  { id: 'cohere/north-mini-code:free',            name: 'North Mini Code',       ctx: 256_000, free: true },
  { id: 'dots-studio/dots-3-note-preview:free',   name: 'Dots 3 Note',           ctx: 512_000, free: true },
  { id: 'recursive/flint-v1.0:free',              name: 'Flint 1.0',             ctx: 262_144, free: true },
  { id: 'nvidia/nemotron-3.5-super-vl:free',      name: 'Nemotron 3.5 VL',       ctx: 1_000_000, free: true },
  { id: 'openrouter/free',                        name: 'موجّه النماذج المجانية', ctx: 200_000,  free: true },

  { id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek V4.1 Flash 1017', ctx: 1_048_576, free: false,
    price: '$0.038 / $0.50 لكل مليون' },
  { id: 'deepseek/deepseek-v4.1-flash',      name: 'DeepSeek V4.1 Flash',      ctx: 1_048_576, free: false,
    price: '$0.051 / $0.203 لكل مليون' },
  { id: 'deepseek/deepseek-v3.2',            name: 'DeepSeek V3.2',            ctx: 163_840,  free: false,
    price: '$0.26 / $0.38 لكل مليون' },
];

const DEFAULT_MODEL = MODELS[0].id;

/* ── حالة ─────────────────────────────────────────── */
const state = {
  model: DEFAULT_MODEL,
  messages: [],
  key: '',
  system: '',
  busy: false,
  abort: null,
  serverKey: false,
  usedTokens: 0,
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const el = {
  rail: $('#rail'), scrim: $('#scrim'), menuBtn: $('#menuBtn'), railClose: $('#railClose'),
  modelList: $('#modelList'), newChat: $('#newChat'), exportBtn: $('#exportBtn'),
  settingsBtn: $('#settingsBtn'), settingsSheet: $('#settingsSheet'), settingsForm: $('#settingsForm'),
  keyInput: $('#keyInput'), keyHint: $('#keyHint'), sysInput: $('#sysInput'),
  saveSettings: $('#saveSettings'), clearAll: $('#clearAll'),
  transcript: $('#transcript'), messages: $('#messages'), welcome: $('#welcome'),
  starters: $('#starters'), composer: $('#composer'), input: $('#input'),
  sendBtn: $('#sendBtn'), stopBtn: $('#stopBtn'),
  currentModel: $('#currentModel'), statusDot: $('#statusDot'), ctxTag: $('#ctxTag'),
  gauge: $('#gauge'), gaugeFill: $('#gaugeFill'), gaugeNum: $('#gaugeNum'), gaugeMax: $('#gaugeMax'),
  railHint: $('#railHint'), toast: $('#toast'),
};

/* ── تخزين ────────────────────────────────────────── */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

function loadLocal() {
  state.key    = store.get('amq.key', '') || '';
  state.system = store.get('amq.system', '') || '';
  const thread = store.get('amq.thread', null);
  if (thread && Array.isArray(thread.messages)) {
    state.messages = thread.messages;
    if (thread.model && MODELS.some(m => m.id === thread.model)) state.model = thread.model;
  }
}

function saveThread() {
  store.set('amq.thread', { model: state.model, messages: state.messages, ts: Date.now() });
}

/* ── أدوات ────────────────────────────────────────── */
function modelOf(id = state.model) {
  return MODELS.find(m => m.id === id) || MODELS[0];
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function estimateTokens(text) {
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const rest = text.length - ar;
  return Math.ceil(ar / 2 + rest / 4);
}

let toastTimer;
function toast(msg, bad = false) {
  el.toast.textContent = msg;
  el.toast.classList.toggle('bad', bad);
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3400);
}

function hint(msg, kind = '') {
  el.railHint.textContent = msg || '';
  el.railHint.className = 'rail-hint' + (kind ? ' ' + kind : '');
}

function setStatus(kind) {
  el.statusDot.className = 'dot' + (kind ? ' ' + kind : '');
}

/* ── ماركداون ─────────────────────────────────────── */
function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,؛:]|$)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|[\s])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s;
}

function codeBlock(lang, code) {
  const label = lang || 'code';
  return `<div class="code-block"><div class="code-head"><span>${esc(label)}</span>` +
         `<button class="copy-btn" type="button">نسخ</button></div>` +
         `<pre><code>${esc(code.replace(/\n$/, ''))}</code></pre></div>`;
}

function renderMarkdown(src) {
  const blocks = [];
  let text = String(src).replace(/```([^\n`]*)\n([\s\S]*?)(?:```|$)/g, (_, lang, code) => {
    blocks.push({ lang: lang.trim(), code });
    return `\u0000${blocks.length - 1}\u0000`;
  });

  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let para = [];

  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const ph = trimmed.match(/^\u0000(\d+)\u0000$/);
    if (ph) { flush(); const b = blocks[+ph[1]]; out.push(codeBlock(b.lang, b.code)); i++; continue; }

    if (!trimmed) { flush(); i++; continue; }

    let m;
    if ((m = trimmed.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      const lvl = m[1].length;
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
      i++; continue;
    }

    if (/^([-*_])\s*\1\s*\1[\s\1]*$/.test(trimmed)) { flush(); out.push('<hr>'); i++; continue; }

    if (/^>\s?/.test(trimmed)) {
      flush();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^\|.*\|$/.test(trimmed) && /^\|[\s:|-]+\|$/.test((lines[i + 1] || '').trim())) {
      flush();
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>');
      continue;
    }

    if (/^([-*+]|\d+[.)])\s+/.test(trimmed)) {
      flush();
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items = [];
      while (i < lines.length && /^([-*+]|\d+[.)])\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([-*+]|\d+[.)])\s+/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map(t => `<li>${inline(t)}</li>`).join('') + `</${tag}>`);
      continue;
    }

    para.push(trimmed);
    i++;
  }
  flush();
  return out.join('\n');
}

/* ── رسم المحادثة ─────────────────────────────────── */
function isArabic(s) {
  const ar = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const la = (s.match(/[A-Za-z]/g) || []).length;
  return ar > 0 && ar >= la * 0.6;
}

function addTurn(role, text, { streaming = false } = {}) {
  const turn = document.createElement('article');
  turn.className = 'turn ' + (role === 'user' ? 'user' : 'bot');

  const label = document.createElement('div');
  label.className = 'turn-role';
  label.textContent = role === 'user' ? 'أنت' : modelOf().name;

  const body = document.createElement('div');
  body.className = 'turn-body';
  body.dir = isArabic(text) ? 'rtl' : 'auto';

  const actions = document.createElement('div');
  actions.className = 'turn-actions';

  if (role === 'user') {
    body.textContent = text;
    const copy = document.createElement('button');
    copy.className = 'mini-btn'; copy.textContent = 'نسخ';
    copy.onclick = () => navigator.clipboard?.writeText(text).then(() => toast('تم النسخ'));
    actions.append(copy);
  } else {
    body.innerHTML = streaming
      ? '<span class="typing"><i></i><i></i><i></i></span>'
      : renderMarkdown(text);
    const copy = document.createElement('button');
    copy.className = 'mini-btn'; copy.textContent = 'نسخ';
    copy.onclick = () => navigator.clipboard?.writeText(streamedText).then(() => toast('تم النسخ'));
    const retry = document.createElement('button');
    retry.className = 'mini-btn'; retry.textContent = 'إعادة';
    retry.onclick = () => regenerate(turn);
    actions.append(copy, retry);
  }

  turn.append(label, body, actions);
  el.messages.append(turn);
  el.welcome.classList.add('hide');
  scrollDown();
  return { turn, body, actions };
}

function scrollDown(force = false) {
  const t = el.transcript;
  const near = t.scrollHeight - t.scrollTop - t.clientHeight < 160;
  if (near || force) t.scrollTop = t.scrollHeight;
}

function renderThread() {
  el.messages.innerHTML = '';
  if (!state.messages.length) { el.welcome.classList.remove('hide'); updateGauge(); return; }
  el.welcome.classList.add('hide');
  state.messages.forEach(m => {
    if (m.role === 'system') return;
    // نحفظ النص الأصلي لزر النسخ
    const { body } = addTurn(m.role, m.content);
    if (m.role === 'assistant') storeRaw(body, m.content);
  });
  updateGauge();
  scrollDown(true);
}

function storeRaw(body, text) {
  const btn = body.parentElement.querySelector('.turn-actions .mini-btn');
  if (btn) btn.onclick = () => navigator.clipboard?.writeText(text).then(() => toast('تم النسخ'));
}

/* ── مقياس السياق ─────────────────────────────────── */
function updateGauge() {
  const m = modelOf();
  const used = state.messages.reduce((n, x) => n + estimateTokens(x.content) + 4, 0);
  state.usedTokens = used;
  const pct = Math.min(100, (used / m.ctx) * 100);
  el.gaugeFill.style.width = Math.max(pct, used > 0 ? 1.5 : 0) + '%';
  el.gaugeNum.textContent = fmtTokens(used);
  el.gaugeMax.textContent = fmtNum(m.ctx);
  el.ctxTag.textContent = fmtNum(m.ctx);
  el.gauge.title = `${fmtTokens(used)} من ${fmtTokens(m.ctx)} رمز (تقديري)`;
}

/* ── قائمة النماذج ────────────────────────────────── */
function renderModels() {
  el.modelList.innerHTML = '';
  let lastFree = null;
  MODELS.forEach((m, idx) => {
    if (idx === 0 || m.free !== lastFree) {
      const g = document.createElement('div');
      g.className = 'model-group';
      g.textContent = m.free ? 'مجاني' : 'مدفوع (رصيد OpenRouter)';
      el.modelList.append(g);
      lastFree = m.free;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'model-opt';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(m.id === state.model));
    b.title = m.free ? `${m.name} — ${fmtNum(m.ctx)} رمز` : `${m.name} — ${m.price}`;

    const name = document.createElement('span');
    name.className = 'm-name';
    name.textContent = m.id;

    const tag = document.createElement('span');
    tag.className = 'm-tag' + (m.free ? '' : ' paid');
    tag.textContent = fmtNum(m.ctx);

    b.append(name, tag);
    b.onclick = () => selectModel(m.id);
    el.modelList.append(b);
  });
}

function selectModel(id) {
  state.model = id;
  store.set('amq.model', id);
  saveThread();
  $$('.model-opt', el.modelList).forEach(b => {
    b.setAttribute('aria-checked', String(b.querySelector('.m-name').textContent === id));
  });
  el.currentModel.textContent = id;
  $$('.turn.bot .turn-role').forEach(r => { r.textContent = modelOf().name; });
  updateGauge();
}

/* ── الاتصال ──────────────────────────────────────── */
async function probeServer() {
  // استضافة ثابتة (GitHub Pages) أو فتح الملف مباشرة → ما في API على السيرفر
  if (location.protocol === 'file:' || location.hostname.endsWith('github.io')) return false;
  try {
    const r = await fetch('./api/config', { cache: 'no-store' });
    if (!r.ok) return false;
    const j = await r.json();
    state.serverKey = !!j.hasServerKey;
    return state.serverKey;
  } catch { return false; }
}

function payloadMessages() {
  const sys = state.system.trim();
  const base = sys ? [{ role: 'system', content: sys }] : [];
  return base.concat(state.messages);
}

async function send(bodyText, { onDelta, signal }) {
  const url = state.serverKey ? './api/chat' : 'https://openrouter.ai/api/v1/chat/completions';
  const headers = { 'Content-Type': 'application/json' };

  if (!state.serverKey) {
    if (!state.key) { const e = new Error('missing_key'); e.code = 'missing_key'; throw e; }
    headers.Authorization = 'Bearer ' + state.key;
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'AMQ';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: state.model,
      messages: payloadMessages(),
      stream: true,
      temperature: 1.0,
      top_p: 1.0,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error?.message || j?.error || j?.detail || JSON.stringify(j).slice(0, 300);
    } catch { detail = (await res.text().catch(() => '')).slice(0, 300); }
    const e = new Error(detail || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const d = j.choices?.[0]?.delta;
        const piece = d?.content || '';
        if (piece) { full += piece; onDelta(piece); }
      } catch { /* سطر جزئي */ }
    }
  }
  return full;
}

/* ── الإرسال ──────────────────────────────────────── */
async function submit(text) {
  text = text.trim();
  if (!text || state.busy) return;

  if (!state.serverKey && !state.key) {
    toast('أضف مفتاح OpenRouter من الإعدادات أولاً', true);
    openSettings();
    return;
  }

  el.welcome.classList.add('hide');
  state.messages.push({ role: 'user', content: text });
  addTurn('user', text);
  saveThread();
  updateGauge();

  const { body } = addTurn('assistant', '', { streaming: true });
  const streamEl = body.querySelector('.typing');

  state.busy = true;
  el.sendBtn.disabled = true;
  el.stopBtn.hidden = false;
  setStatus('busy');
  hint('');

  const ctrl = new AbortController();
  state.abort = ctrl;

  let acc = '';
  let raf = 0;
  let first = true;

  const paint = () => {
    raf = 0;
    body.innerHTML = renderMarkdown(acc) + '<span class="caret"></span>';
    scrollDown();
  };

  try {
    const full = await send(text, {
      signal: ctrl.signal,
      onDelta(piece) {
        acc += piece;
        if (first) { streamEl?.remove(); first = false; }
        if (!raf) raf = requestAnimationFrame(paint);
      },
    });

    if (raf) cancelAnimationFrame(raf);
    acc = full || acc;
    body.innerHTML = renderMarkdown(acc);
    body.dir = isArabic(acc) ? 'rtl' : 'auto';
    storeRaw(body, acc);
    state.messages.push({ role: 'assistant', content: acc });
    saveThread();
    updateGauge();
    setStatus('');
  } catch (err) {
    if (raf) cancelAnimationFrame(raf);
    if (err.name === 'AbortError') {
      body.innerHTML = renderMarkdown(acc || '_تم الإيقاف._');
      if (acc) { state.messages.push({ role: 'assistant', content: acc }); saveThread(); }
      setStatus('');
    } else {
      body.innerHTML = '';
      const box = document.createElement('p');
      box.style.color = 'var(--err)';
      box.textContent = describeError(err);
      body.append(box);
      setStatus('err');
      if (err.code === 'missing_key') openSettings();
    }
  } finally {
    state.busy = false;
    state.abort = null;
    el.sendBtn.disabled = false;
    el.stopBtn.hidden = true;
    el.input.focus();
    scrollDown();
  }
}

function describeError(err) {
  const s = err.status;
  if (s === 401) return 'المفتاح غير صحيح أو منتهي. راجع الإعدادات.';
  if (s === 402) return 'رصيد OpenRouter غير كافٍ لهذا النموذج. جرّب نموذجاً مجانياً.';
  if (s === 429) return 'تجاوزت حدّ الطلبات. انتظر لحظة ثم أعد المحاولة.';
  if (s === 404) return 'النموذج غير متاح حالياً. اختر نموذجاً آخر.';
  if (s === 403) return 'المزوّد رفض الطلب (قد يكون النموذج مقيّداً في منطقتك).';
  if (err.code === 'missing_key') return 'أضف مفتاح OpenRouter من الإعدادات.';
  if (/fetch|network|Failed/i.test(err.message)) return 'تعذّر الاتصال. تحقّق من الشبكة.';
  return 'خطأ: ' + (err.message || 'غير معروف');
}

async function regenerate(turnEl) {
  if (state.busy) return;
  const turns = [...el.messages.children];
  const idx = turns.indexOf(turnEl);
  const msgIdx = state.messages.findIndex((m, k) => k === idx);
  if (msgIdx < 0) return;
  state.messages.splice(msgIdx);
  saveThread();
  renderThread();
  const lastUser = [...state.messages].reverse().find(m => m.role === 'user');
  if (lastUser) {
    state.messages.pop();
    submit(lastUser.content);
  }
}

/* ── إعدادات ──────────────────────────────────────── */
function openSettings() {
  el.keyInput.value = state.key;
  el.sysInput.value = state.system;
  el.keyHint.className = 'field-hint';
  el.keyHint.textContent = state.serverKey
    ? 'الخادم مهيّأ بمفتاح جاهز — لا حاجة لإدخال مفتاح.'
    : 'يُخزَّن في متصفّحك فقط ولا يُرسَل لأي خادم غير OpenRouter.';
  el.settingsSheet.showModal();
}

el.settingsForm.addEventListener('submit', e => {
  const val = el.saveSettings.value;
  if (val !== 'save') return;
  state.key = el.keyInput.value.trim();
  state.system = el.sysInput.value;
  store.set('amq.key', state.key);
  store.set('amq.system', state.system);
  toast('تم الحفظ');
});

el.clearAll.onclick = () => {
  state.messages = [];
  store.del('amq.thread');
  renderThread();
  el.settingsSheet.close();
  toast('تم مسح المحادثات');
};

/* ── أحداث ────────────────────────────────────────── */
el.composer.addEventListener('submit', e => {
  e.preventDefault();
  const text = el.input.value;
  el.input.value = '';
  autoGrow();
  submit(text);
});

el.input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    el.composer.requestSubmit();
  }
});

function autoGrow() {
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 220) + 'px';
}
el.input.addEventListener('input', autoGrow);

el.stopBtn.onclick = () => state.abort?.abort();

el.newChat.onclick = () => {
  if (state.busy) state.abort?.abort();
  state.messages = [];
  renderThread();
  saveThread();
  closeRail();
  el.input.focus();
  toast('محادثة جديدة');
};

el.exportBtn.onclick = () => {
  if (!state.messages.length) return toast('لا يوجد ما يُنزَّل', true);
  const md = state.messages.map(m => `### ${m.role === 'user' ? 'أنا' : modelOf().name}\n\n${m.content}\n`).join('\n---\n\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `amq-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
};

el.settingsBtn.onclick = openSettings;

el.starters.addEventListener('click', e => {
  const btn = e.target.closest('.starter');
  if (!btn) return;
  submit(btn.dataset.q);
});

document.addEventListener('click', e => {
  const cp = e.target.closest('.copy-btn');
  if (!cp) return;
  const code = cp.closest('.code-block')?.querySelector('pre code')?.textContent || '';
  navigator.clipboard?.writeText(code).then(() => {
    cp.textContent = 'تم';
    cp.classList.add('done');
    setTimeout(() => { cp.textContent = 'نسخ'; cp.classList.remove('done'); }, 1600);
  });
});

/* الجوال */
function openRail() { el.rail.classList.add('open'); el.scrim.hidden = false; }
function closeRail() { el.rail.classList.remove('open'); el.scrim.hidden = true; }
el.menuBtn.onclick = openRail;
el.railClose.onclick = closeRail;
el.scrim.onclick = closeRail;

el.transcript.addEventListener('scroll', () => {}, { passive: true });

/* ── بدء ──────────────────────────────────────────── */
(async function boot() {
  loadLocal();
  renderModels();
  selectModel(state.model);
  renderThread();

  el.currentModel.textContent = state.model;
  updateGauge();

  const has = await probeServer();
  if (has) {
    hint('المفتاح مهيّأ على الخادم — أنت جاهز.');
  } else if (!state.key) {
    hint('أضف مفتاح OpenRouter لتبدأ.', 'warn');
    setTimeout(openSettings, 600);
  } else {
    hint('المفتاح محفوظ في متصفحك.');
  }
})();
