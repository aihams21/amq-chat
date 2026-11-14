/* عُمق / AMQ — منطق الواجهة (DeepSeek · مزودات متعددة · مهارات · إضافات) */

import { PROVIDERS, providerOf, defaultModelOf } from './data/providers.js';
import { SKILLS, MAX_SKILLS } from './data/skills.js';
import { PLUGINS } from './data/plugins.js';
import { PERSONA, GUARDRAILS } from './data/persona.js';

/* ── حالة ─────────────────────────────────────────── */
const state = {
  providerId: 'openrouter',
  modelId: 'deepseek/deepseek-v4.1-flash-1017',
  effort: 'high',
  messages: [],
  keys: {},
  customModels: {},
  skills: [],
  customSkills: [],
  plugins: [],
  persona: true,
  system: '',
  busy: false,
  abort: null,
  serverKey: false,
  usedTokens: 0,
  toolContext: [],
};

const K = {
  provider: 'amq.v2.provider',
  model: 'amq.v2.model',
  effort: 'amq.v2.effort',
  thread: 'amq.v2.thread',
  keys: 'amq.v2.keys',
  customModels: 'amq.v2.customModels',
  skills: 'amq.v2.skills',
  customSkills: 'amq.v2.customSkills',
  plugins: 'amq.v2.plugins',
  persona: 'amq.v2.persona',
  system: 'amq.v2.system',
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const el = {
  rail: $('#rail'), scrim: $('#scrim'), menuBtn: $('#menuBtn'), railClose: $('#railClose'),
  providerList: $('#providerList'), modelList: $('#modelList'), addModel: $('#addModel'),
  effortSeg: $('#effortSeg'), effortNote: $('#effortNote'),
  newChat: $('#newChat'), exportBtn: $('#exportBtn'), settingsBtn: $('#settingsBtn'),
  skillsBtn: $('#skillsBtn'), pluginsBtn: $('#pluginsBtn'),
  skillsCount: $('#skillsCount'), pluginsCount: $('#pluginsCount'),
  skillsSheet: $('#skillsSheet'), skillsClose: $('#skillsClose'), skillList: $('#skillList'),
  skillSearch: $('#skillSearch'), skillCount: $('#skillCount'), skillMax: $('#skillMax'),
  skillsClear: $('#skillsClear'), skillsDone: $('#skillsDone'),
  importBox: $('#importBox'), impName: $('#impName'), impBody: $('#impBody'), impSave: $('#impSave'), impClear: $('#impClear'),
  pluginsSheet: $('#pluginsSheet'), pluginsClose: $('#pluginsClose'), pluginList: $('#pluginList'),
  pluginsClear: $('#pluginsClear'), pluginsDone: $('#pluginsDone'),
  providerSheet: $('#providerSheet'), providerForm: $('#providerForm'), provTitle: $('#provTitle'),
  provLatin: $('#provLatin'), provNote: $('#provNote'), provKeyInput: $('#provKeyInput'),
  provKeyHint: $('#provKeyHint'), provLink: $('#provLink'), testKey: $('#testKey'),
  clearKey: $('#clearKey'), saveKey: $('#saveKey'), testOut: $('#testOut'),
  settingsSheet: $('#settingsSheet'), settingsForm: $('#settingsForm'), personaToggle: $('#personaToggle'),
  sysInput: $('#sysInput'), saveSettings: $('#saveSettings'), clearAll: $('#clearAll'),
  transcript: $('#transcript'), messages: $('#messages'), welcome: $('#welcome'), starters: $('#starters'),
  composer: $('#composer'), input: $('#input'), sendBtn: $('#sendBtn'), stopBtn: $('#stopBtn'),
  fetchBtn: $('#fetchBtn'), searchBtn: $('#searchBtn'),
  currentModel: $('#currentModel'), statusDot: $('#statusDot'), ctxTag: $('#ctxTag'), personaChip: $('#personaChip'),
  gauge: $('#gauge'), gaugeFill: $('#gaugeFill'), gaugeNum: $('#gaugeNum'), gaugeMax: $('#gaugeMax'),
  railHint: $('#railHint'), toast: $('#toast'),
};

/* ── تخزين ────────────────────────────────────────── */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/* ── أدوات ────────────────────────────────────────── */
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
function setStatus(kind) { el.statusDot.className = 'dot' + (kind ? ' ' + kind : ''); }

const currentProvider = () => providerOf(state.providerId);
const currentModel = () => {
  const p = currentProvider();
  const all = [...p.models, ...(state.customModels[p.id] || [])];
  return all.find(m => m.id === state.modelId) || all[0] || { id: state.modelId, name: state.modelId, ctx: 128000 };
};
const keyOf = pid => state.keys[pid] || '';
const allSkills = () => [...SKILLS, ...state.customSkills];
const activeSkills = () => state.skills.map(id => allSkills().find(s => s.id === id)).filter(Boolean);
const activePlugins = () => state.plugins.map(id => PLUGINS.find(p => p.id === id)).filter(Boolean);

/* ── تحميل ────────────────────────────────────────── */
function loadLocal() {
  state.providerId = store.get(K.provider, 'openrouter');
  state.effort     = store.get(K.effort, 'high');
  state.keys       = store.get(K.keys, {}) || {};
  state.customModels = store.get(K.customModels, {}) || {};
  state.skills     = store.get(K.skills, []) || [];
  state.customSkills = store.get(K.customSkills, []) || [];
  state.plugins    = store.get(K.plugins, []) || [];
  state.persona    = store.get(K.persona, true);
  state.system     = store.get(K.system, '') || '';

  // ترحيل المفتاح القديم
  const oldKey = store.get('amq.key', '');
  if (oldKey && !state.keys.openrouter) state.keys.openrouter = oldKey;

  const p = currentProvider();
  if (!PROVIDERS.some(x => x.id === state.providerId)) state.providerId = 'openrouter';
  state.modelId = store.get(K.model, '') || defaultModelOf(currentProvider());
  const all = [...currentProvider().models, ...(state.customModels[currentProvider().id] || [])];
  if (!all.some(m => m.id === state.modelId)) state.modelId = defaultModelOf(currentProvider());

  const thread = store.get(K.thread, null) || store.get('amq.thread', null);
  if (thread && Array.isArray(thread.messages)) state.messages = thread.messages;
}

function saveThread() {
  store.set(K.thread, { provider: state.providerId, model: state.modelId, messages: state.messages, ts: Date.now() });
}
function persistPrefs() {
  store.set(K.provider, state.providerId);
  store.set(K.model, state.modelId);
  store.set(K.effort, state.effort);
  store.set(K.keys, state.keys);
  store.set(K.customModels, state.customModels);
  store.set(K.skills, state.skills);
  store.set(K.customSkills, state.customSkills);
  store.set(K.plugins, state.plugins);
  store.set(K.persona, state.persona);
  store.set(K.system, state.system);
}

/* ── ماركداون ─────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,؛:]|$)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };

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
        rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
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
  label.textContent = role === 'user' ? 'أنت' : currentModel().name;

  const body = document.createElement('div');
  body.className = 'turn-body';
  body.dir = isArabic(text) ? 'rtl' : 'auto';

  let think = null, thinkBody = null, answer = body;
  if (role !== 'user') {
    think = document.createElement('details');
    think.className = 'think';
    think.hidden = true;
    const sum = document.createElement('summary');
    sum.textContent = 'تفكير النموذج';
    thinkBody = document.createElement('div');
    thinkBody.className = 'think-body';
    think.append(sum, thinkBody);
    answer = document.createElement('div');
    answer.className = 'answer';
    body.append(think, answer);
  }

  const actions = document.createElement('div');
  actions.className = 'turn-actions';

  if (role === 'user') {
    body.textContent = text;
    const copy = document.createElement('button');
    copy.className = 'mini-btn'; copy.textContent = 'نسخ';
    copy.onclick = () => navigator.clipboard?.writeText(text).then(() => toast('تم النسخ'));
    actions.append(copy);
  } else {
    answer.innerHTML = streaming
      ? '<span class="typing"><i></i><i></i><i></i></span>'
      : renderMarkdown(text);
    const copy = document.createElement('button');
    copy.className = 'mini-btn'; copy.textContent = 'نسخ';
    copy.onclick = () => navigator.clipboard?.writeText(answer.dataset.raw || text).then(() => toast('تم النسخ'));
    const retry = document.createElement('button');
    retry.className = 'mini-btn'; retry.textContent = 'إعادة';
    retry.onclick = () => regenerate(turn);
    actions.append(copy, retry);
  }

  turn.append(label, body, actions);
  el.messages.append(turn);
  el.welcome.classList.add('hide');
  scrollDown();
  return { turn, body, answer, think, thinkBody, actions };
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
    const { answer, think, thinkBody } = addTurn(m.role, m.content);
    if (m.role === 'assistant') {
      answer.dataset.raw = m.content;
      if (m.reasoning && think) {
        think.hidden = false;
        thinkBody.textContent = m.reasoning;
      }
    }
  });
  updateGauge();
  scrollDown(true);
}

/* ── مقياس السياق ─────────────────────────────────── */
function systemPrompt() {
  const parts = [];
  if (state.persona) parts.push(PERSONA);
  parts.push(GUARDRAILS);
  const sk = activeSkills();
  if (sk.length) parts.push('## المهارات المفعّلة\n' + sk.map(s => `### ${s.name}\n${s.prompt}`).join('\n\n'));
  const pl = activePlugins();
  if (pl.length) parts.push('## الإضافات المفعّلة\n' + pl.map(p => `### ${p.name}\n${p.prompt}`).join('\n\n'));
  if (state.plugins.includes('websearch')) {
    parts.push(`## أداة البحث الحقيقية
عند حاجتك لمعلومة حديثة أو حقيقية من الإنترنت (إصدار، ثغرة، خبر، توثيق، سعر، شخص)، اكتب في نهاية ردّك سطراً وحده بالصيغة:
[[SEARCH: استعلام دقيق]]
ثم توقّف. سأجلب نتائج بحث حقيقية وأعيدها لك لتكمل الإجابة بالاستناد إليها مع ذكر المصادر.
لا تخترع نتائج بحث ولا تدّعِ أنك بحثت إن لم تستخدم الأداة. البحث الحقيقي الوحيد المتاح هو هذه الأداة.`);
  }
  if (state.system.trim()) parts.push('## تعليمات المستخدم\n' + state.system.trim());
  return parts.join('\n\n');
}

function updateGauge() {
  const m = currentModel();
  const sysTokens = estimateTokens(systemPrompt());
  const used = state.messages.reduce((n, x) => n + estimateTokens(x.content) + 4, sysTokens);
  state.usedTokens = used;
  const pct = Math.min(100, (used / m.ctx) * 100);
  el.gaugeFill.style.width = Math.max(pct, used > 0 ? 1.5 : 0) + '%';
  el.gaugeNum.textContent = fmtTokens(used);
  el.gaugeMax.textContent = fmtNum(m.ctx);
  el.ctxTag.textContent = fmtNum(m.ctx);
  el.gauge.title = `${fmtTokens(used)} من ${fmtTokens(m.ctx)} رمز (تقديري، مع تعليمات النظام)`;
}

/* ── المزوّدون ────────────────────────────────────── */
const KIND_LABEL = { ok: 'سحابي', local: 'محلي', blocked: 'محجوب CORS' };

function renderProviders() {
  el.providerList.innerHTML = '';
  let lastKind = null;
  PROVIDERS.forEach(p => {
    if (p.kind !== lastKind) {
      const g = document.createElement('div');
      g.className = 'model-group';
      g.textContent = KIND_LABEL[p.kind];
      el.providerList.append(g);
      lastKind = p.kind;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'provider-opt';
    b.dataset.id = p.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(p.id === state.providerId));
    b.title = p.note;

    const name = document.createElement('span');
    name.className = 'p-name';
    name.textContent = p.name;

    const st = document.createElement('span');
    st.className = 'p-tag ' + p.kind;
    if (p.kind === 'blocked') st.textContent = '⛔';
    else if (p.kind === 'local') st.textContent = 'محلي';
    else if (keyOf(p.id)) st.textContent = 'مفتاح ✓';
    else st.textContent = p.free ? 'مجاني' : 'مفتاح';

    b.append(name, st);
    b.onclick = () => {
      if (p.kind === 'blocked') {
        toast('هذا المزوّد يحجب CORS من المتصفح — يحتاج خادم وسيط (Vercel).', true);
        return;
      }
      selectProvider(p.id);
    };
    el.providerList.append(b);
  });
}

function selectProvider(id) {
  const p = providerOf(id);
  state.providerId = id;
  const saved = store.get(K.model, '');
  const all = [...p.models, ...(state.customModels[id] || [])];
  state.modelId = all.some(m => m.id === saved) ? saved : defaultModelOf(p);
  renderProviders();
  renderModels();
  updateTopbar();
  updateEffort();
  updateGauge();
  persistPrefs();
  closeRail();
  if (p.kind !== 'local' && !keyOf(id)) {
    openProviderSheet(id);
    hint(`${p.name}: أضف المفتاح لتبدأ.`, 'warn');
  } else {
    hint(p.kind === 'local' ? `${p.name} — تأكد أن السيرفر شغّال.` : `${p.name} جاهز.`);
  }
}

/* ── النماذج ──────────────────────────────────────── */
function renderModels() {
  el.modelList.innerHTML = '';
  const p = currentProvider();
  const models = [...p.models, ...(state.customModels[p.id] || [])];
  models.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'model-opt';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(m.id === state.modelId));
    b.title = `${m.name} — ${fmtNum(m.ctx)} رمز${m.price ? ' — ' + m.price : ''}`;

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
  state.modelId = id;
  store.set(K.model, id);
  renderModels();
  updateTopbar();
  updateGauge();
  saveThread();
  $$('.turn.bot .turn-role').forEach(r => { r.textContent = currentModel().name; });
}

function updateTopbar() {
  el.currentModel.textContent = state.modelId;
  el.currentModel.title = `${currentProvider().name} — ${state.modelId}`;
  el.personaChip.hidden = !state.persona;
}

el.addModel.onclick = () => {
  const p = currentProvider();
  const id = prompt(`معرّف الموديل عند ${p.name}:\n(مثال: deepseek/deepseek-v3.2)`);
  if (!id || !id.trim()) return;
  const ctxRaw = prompt('حجم السياق بالرموز؟', '131072');
  const ctx = Math.max(4096, parseInt(ctxRaw || '131072', 10) || 131072);
  const list = state.customModels[p.id] || (state.customModels[p.id] = []);
  if (list.some(m => m.id === id.trim())) return toast('الموديل موجود مسبقاً', true);
  list.push({ id: id.trim(), name: id.trim(), ctx, price: 'مخصص', free: false });
  persistPrefs();
  selectModel(id.trim());
  toast('أُضيف الموديل');
};

/* ── الجهد ────────────────────────────────────────── */
function updateEffort() {
  $$('#effortSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.effort === state.effort)));
  const p = currentProvider();
  if (p.reasoning === 'openrouter') {
    el.effortNote.textContent = 'يُرسَل كـ reasoning.effort — max يرفع max_tokens إلى 32000.';
    el.effortNote.className = 'effort-note ok';
  } else {
    el.effortNote.textContent = 'هذا المزوّد لا يدعم التحكم بالجهد — يُتجاهل.';
    el.effortNote.className = 'effort-note warn';
  }
}
el.effortSeg.addEventListener('click', e => {
  const b = e.target.closest('button[data-effort]');
  if (!b) return;
  state.effort = b.dataset.effort;
  persistPrefs();
  updateEffort();
});

/* ── المهارات ─────────────────────────────────────── */
function renderSkills() {
  const q = el.skillSearch.value.trim().toLowerCase();
  el.skillList.innerHTML = '';
  const groups = {};
  allSkills()
    .filter(s => !q || (s.name + ' ' + s.desc + ' ' + s.id + ' ' + s.group).toLowerCase().includes(q))
    .forEach(s => (groups[s.group || 'مخصص'] ||= []).push(s));

  Object.entries(groups).forEach(([g, list]) => {
    const h = document.createElement('div');
    h.className = 'model-group';
    h.textContent = g;
    el.skillList.append(h);
    list.forEach(s => {
      const on = state.skills.includes(s.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'skill-opt' + (on ? ' on' : '');
      b.setAttribute('aria-pressed', String(on));
      const box = document.createElement('span');
      box.className = 'skill-box';
      box.textContent = on ? '✓' : '';
      const txt = document.createElement('span');
      txt.className = 'skill-txt';
      const t = document.createElement('b');
      t.textContent = s.name;
      const d = document.createElement('small');
      d.textContent = s.desc;
      txt.append(t, d);
      b.append(box, txt);
      b.onclick = () => toggleSkill(s.id);
      el.skillList.append(b);
    });
  });

  el.skillCount.textContent = String(state.skills.length);
  el.skillsCount.textContent = String(state.skills.length);
  el.skillMax.textContent = String(MAX_SKILLS);
}

function toggleSkill(id) {
  const i = state.skills.indexOf(id);
  if (i >= 0) state.skills.splice(i, 1);
  else {
    if (state.skills.length >= MAX_SKILLS) return toast(`الحد ${MAX_SKILLS} مهارات مفعّلة`, true);
    state.skills.push(id);
  }
  persistPrefs();
  renderSkills();
  updateGauge();
}

el.skillsBtn.onclick = () => { renderSkills(); el.skillsSheet.showModal(); };
el.skillsClose.onclick = () => el.skillsSheet.close();
el.skillsDone.onclick = () => el.skillsSheet.close();
el.skillSearch.addEventListener('input', renderSkills);
el.skillsClear.onclick = () => { state.skills = []; persistPrefs(); renderSkills(); updateGauge(); toast('أُلغيت كل المهارات'); };

el.impSave.onclick = () => {
  const name = el.impName.value.trim();
  const body = el.impBody.value.trim();
  if (!name || body.length < 20) return toast('اسم + محتوى (20 حرفاً على الأقل)', true);
  const id = 'custom-' + Date.now().toString(36);
  state.customSkills.push({ id, name, group: 'مخصص', desc: body.slice(0, 90) + '…', prompt: body });
  persistPrefs();
  el.impName.value = ''; el.impBody.value = '';
  renderSkills();
  toast('أُضيفت المهارة');
};
el.impClear.onclick = () => {
  state.customSkills = [];
  state.skills = state.skills.filter(id => !id.startsWith('custom-'));
  persistPrefs();
  renderSkills();
  toast('حُذفت المهارات المستوردة');
};

/* ── الإضافات ─────────────────────────────────────── */
function renderPlugins() {
  el.pluginList.innerHTML = '';
  PLUGINS.forEach(p => {
    const on = state.plugins.includes(p.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'skill-opt' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', String(on));
    const box = document.createElement('span');
    box.className = 'skill-box';
    box.textContent = on ? '✓' : '';
    const txt = document.createElement('span');
    txt.className = 'skill-txt';
    const t = document.createElement('b');
    t.textContent = p.name;
    const d = document.createElement('small');
    d.textContent = p.desc;
    txt.append(t, d);
    b.append(box, txt);
    b.onclick = () => {
      const i = state.plugins.indexOf(p.id);
      if (i >= 0) state.plugins.splice(i, 1); else state.plugins.push(p.id);
      persistPrefs();
      renderPlugins();
      updateToolBtns();
      updateGauge();
    };
    el.pluginList.append(b);
  });
  el.pluginsCount.textContent = String(state.plugins.length);
}

function updateToolBtns() {
  el.fetchBtn.hidden = !state.plugins.includes('webfetch');
  el.searchBtn.hidden = !state.plugins.includes('websearch');
}

el.pluginsBtn.onclick = () => { renderPlugins(); el.pluginsSheet.showModal(); };
el.pluginsClose.onclick = () => el.pluginsSheet.close();
el.pluginsDone.onclick = () => el.pluginsSheet.close();
el.pluginsClear.onclick = () => { state.plugins = []; persistPrefs(); renderPlugins(); updateToolBtns(); updateGauge(); };

/* ── مفتاح المزوّد ────────────────────────────────── */
let sheetProvider = null;

function openProviderSheet(id) {
  const p = providerOf(id);
  sheetProvider = p;
  el.provTitle.textContent = `مفتاح ${p.name}`;
  el.provLatin.textContent = p.latin;
  el.provNote.textContent = p.note;
  el.provKeyInput.value = keyOf(id);
  el.provKeyInput.placeholder = p.keyPrefix ? p.keyPrefix + '…' : 'المفتاح…';
  el.provLink.href = p.keyUrl;
  el.testOut.textContent = '';
  el.testOut.className = 'field-hint';
  el.provKeyHint.textContent = p.kind === 'local'
    ? 'المزوّد المحلي لا يحتاج مفتاحاً عادةً — اتركه فارغاً.'
    : 'يُخزَّن في متصفّحك فقط (localStorage) ويُرسل لهذا المزوّد وحده.';
  el.providerSheet.showModal();
}

el.providerForm.addEventListener('submit', () => {
  if (!sheetProvider) return;
  const val = el.saveKey.value;
  if (val !== 'save') return;
  const k = el.provKeyInput.value.trim();
  if (k) state.keys[sheetProvider.id] = k; else delete state.keys[sheetProvider.id];
  persistPrefs();
  renderProviders();
  toast(k ? `حُفظ مفتاح ${sheetProvider.name}` : 'حُذف المفتاح');
  if (k) hint(`${sheetProvider.name} جاهز.`);
});

el.clearKey.onclick = () => {
  if (!sheetProvider) return;
  delete state.keys[sheetProvider.id];
  el.provKeyInput.value = '';
  persistPrefs();
  renderProviders();
  toast('حُذف المفتاح');
};

el.testKey.onclick = async () => {
  if (!sheetProvider) return;
  const p = sheetProvider;
  const k = el.provKeyInput.value.trim() || keyOf(p.id);
  el.testOut.textContent = 'جارٍ الاختبار…';
  el.testOut.className = 'field-hint';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(p.base.replace(/\/$/, '') + '/models', {
      headers: k ? { Authorization: 'Bearer ' + k } : {},
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const n = Array.isArray(j.data) ? j.data.length : 0;
    el.testOut.textContent = `✓ متصل — ${n} موديل متاح.`;
    el.testOut.className = 'field-hint good';
  } catch (e) {
    clearTimeout(t);
    el.testOut.textContent = /abort/i.test(e.name || '')
      ? '✗ انتهت المهلة (12 ثانية).'
      : `✗ فشل: ${e.message}. تحقّق من المفتاح أو الشبكة أو CORS.`;
    el.testOut.className = 'field-hint bad';
  }
};

/* ── بحث ويب حقيقي (بلا مفتاح) ────────────────────── */
const JINA = 'https://r.jina.ai/';

async function runWebSearch(q) {
  const out = [];
  try {
    const res = await fetch(JINA + 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q), {
      headers: { Accept: 'text/plain' },
    });
    if (res.ok) {
      let t = await res.text();
      t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (t) out.push('### DuckDuckGo\n' + t.slice(0, 9000));
    }
  } catch {}
  try {
    const res = await fetch(
      'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=' +
      encodeURIComponent(q)
    );
    if (res.ok) {
      const j = await res.json();
      const hits = j?.query?.search || [];
      if (hits.length) {
        out.push('### ويكيبيديا\n' + hits.map(h =>
          `- ${h.title}: ${String(h.snippet || '').replace(/<[^>]+>/g, '')}`
        ).join('\n'));
      }
    }
  } catch {}
  if (!out.length) return 'تعذّر تنفيذ البحث (شبكة أو حجب مؤقت). اطلب من المستخدم الرابط مباشرة.';
  return out.join('\n\n').slice(0, 12000);
}

el.searchBtn.onclick = async () => {
  const q = prompt('كلمة البحث:');
  if (!q || !q.trim()) return;
  const old = el.searchBtn.textContent;
  el.searchBtn.disabled = true;
  el.searchBtn.textContent = '…جارٍ البحث';
  try {
    const text = await runWebSearch(q.trim());
    const block = `\n\n--- نتائج بحث: ${q.trim()} ---\n${text}\n--- نهاية النتائج ---\n`;
    el.input.value = (el.input.value + block).trim();
    autoGrow();
    el.input.focus();
    toast('أُضيفت نتائج البحث إلى الرسالة');
  } catch (e) {
    toast('تعذّر البحث: ' + e.message, true);
  } finally {
    el.searchBtn.disabled = false;
    el.searchBtn.textContent = old;
  }
};

/* ── جلب رابط ─────────────────────────────────────── */
el.fetchBtn.onclick = async () => {
  const url = prompt('رابط الصفحة (https://…):');
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) return toast('رابط غير صالح', true);
  const old = el.fetchBtn.textContent;
  el.fetchBtn.disabled = true;
  el.fetchBtn.textContent = '…جارٍ الجلب';
  try {
    const res = await fetch('https://r.jina.ai/' + url, { headers: { Accept: 'text/plain' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let text = await res.text();
    if (text.length > 14000) text = text.slice(0, 14000) + '\n…[مقتطع]';
    const block = `\n\n--- المصدر: ${url} ---\n${text}\n--- نهاية المصدر ---\n`;
    el.input.value = (el.input.value + block).trim();
    autoGrow();
    el.input.focus();
    toast('أُضيفت الصفحة إلى الرسالة');
  } catch (e) {
    toast('تعذّر الجلب: ' + e.message, true);
  } finally {
    el.fetchBtn.disabled = false;
    el.fetchBtn.textContent = old;
  }
};

/* ── الاتصال ──────────────────────────────────────── */
async function probeServer() {
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
  const msgs = [{ role: 'system', content: systemPrompt() }, ...state.messages];
  if (state.toolContext.length) {
    const ctx = state.toolContext.slice(-3)
      .map(c => `### نتائج بحث: ${c.q}\n${c.text}`)
      .join('\n\n');
    msgs.splice(1, 0, {
      role: 'system',
      content: '## سياق أدوات حقيقي (بحث ويب)\n' + ctx.slice(0, 24000),
    });
  }
  return msgs;
}

async function send({ onDelta, onReason, signal }) {
  const p = currentProvider();
  const useProxy = state.serverKey && p.id === 'openrouter';
  const key = keyOf(p.id);

  if (!useProxy && p.kind !== 'local' && !key) {
    const e = new Error('missing_key'); e.code = 'missing_key'; throw e;
  }

  const url = useProxy ? './api/chat' : p.base.replace(/\/$/, '') + '/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (!useProxy) {
    if (key) headers.Authorization = 'Bearer ' + key;
    if (p.id === 'openrouter') {
      headers['HTTP-Referer'] = location.origin || 'https://amq.local';
      headers['X-Title'] = 'AMQ SEC';
    }
  }

  const body = {
    model: state.modelId,
    messages: payloadMessages(),
    stream: true,
    temperature: 1.0,
    top_p: 1.0,
  };
  if (p.reasoning === 'openrouter') {
    body.reasoning = { effort: state.effort };
    if (state.effort === 'max') body.max_tokens = 32000;
  }

  const res = await fetch(url, { method: 'POST', headers, signal, body: JSON.stringify(body) });

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
        if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
        const d = j.choices?.[0]?.delta;
        if (!d) continue;
        const r = d.reasoning ?? d.reasoning_content;
        if (typeof r === 'string' && r) onReason?.(r);
        const piece = d.content || '';
        if (piece) { full += piece; onDelta(piece); }
      } catch (err) {
        if (err.message && !/JSON|Unexpected|unterminated/i.test(err.message)) throw err;
      }
    }
  }
  return full;
}

/* ── الإرسال ──────────────────────────────────────── */
async function submit(text) {
  text = (text || '').trim();
  if (!text || state.busy) return;

  const p = currentProvider();
  if (p.kind !== 'local' && !keyOf(p.id) && !state.serverKey) {
    toast(`أضف مفتاح ${p.name} أولاً`, true);
    openProviderSheet(p.id);
    return;
  }

  el.welcome.classList.add('hide');
  state.messages.push({ role: 'user', content: text });
  addTurn('user', text);
  saveThread();
  updateGauge();

  const { answer, think, thinkBody } = addTurn('assistant', '', { streaming: true });
  const streamEl = answer.querySelector('.typing');

  state.busy = true;
  el.sendBtn.disabled = true;
  el.stopBtn.hidden = false;
  setStatus('busy');
  hint(`${p.name} · ${state.modelId} · ${state.effort}`);

  const ctrl = new AbortController();
  state.abort = ctrl;

  let acc = '';
  let reasoning = '';
  let raf = 0;
  let first = true;

  const paint = () => {
    raf = 0;
    answer.innerHTML = renderMarkdown(acc) + '<span class="caret"></span>';
    scrollDown();
  };
  const paintReason = () => {
    if (!think || !thinkBody) return;
    think.hidden = false;
    think.open = true;
    thinkBody.textContent = reasoning;
    scrollDown();
  };

  try {
    let rounds = 0;
    for (;;) {
      let round = '';
      const full = await send({
        signal: ctrl.signal,
        onDelta(piece) {
          round += piece;
          acc += piece;
          if (first) { streamEl?.remove(); first = false; }
          if (!raf) raf = requestAnimationFrame(paint);
        },
        onReason(piece) {
          reasoning += piece;
          paintReason();
        },
      });
      round = full || round;

      const m = round.match(/\[\[SEARCH:\s*([^\]\n]{2,200})\]\]/i);
      if (!m || rounds >= 2 || ctrl.signal.aborted) break;

      rounds++;
      const q = m[1].trim();
      acc = acc.replace(m[0], '').trimEnd();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      answer.innerHTML = renderMarkdown(acc);
      hint(`بحث ويب: ${q}`);
      const results = await runWebSearch(q);
      state.toolContext.push({ q, text: results, at: Date.now() });
      state.messages.push({ role: 'assistant', content: acc || `أبحث عن: ${q}` });
      state.messages.push({
        role: 'user',
        content: `أكمل الإجابة بالاعتماد على نتائج البحث المرفقة في سياق الأدوات. لا تكرر ما كتبته، واذكر المصادر.`,
      });
      saveThread();
      acc += '\n\n';
      if (!raf) raf = requestAnimationFrame(paint);
    }

    if (raf) cancelAnimationFrame(raf);
    acc = acc.trim();
    if (!acc.trim()) {
      throw new Error(reasoning.trim()
        ? 'الموديل صرف كل max_tokens على التفكير. جرّب high أو أعد المحاولة.'
        : 'رد فارغ من المزوّد.');
    }
    answer.innerHTML = renderMarkdown(acc);
    answer.dataset.raw = acc;
    answer.dir = isArabic(acc) ? 'rtl' : 'auto';
    if (think && reasoning) {
      think.hidden = false;
      think.open = false;
      thinkBody.textContent = reasoning;
    }
    state.messages.push({ role: 'assistant', content: acc, reasoning: reasoning.slice(0, 2000) });
    saveThread();
    updateGauge();
    setStatus('');
    hint(`${p.name} · ${state.effort} · ${fmtTokens(estimateTokens(acc))} رمز${rounds ? ` · ${rounds} بحث` : ''}`);
  } catch (err) {
    if (raf) cancelAnimationFrame(raf);
    if (err.name === 'AbortError') {
      answer.innerHTML = renderMarkdown(acc || '_تم الإيقاف._');
      if (acc) { state.messages.push({ role: 'assistant', content: acc }); saveThread(); }
      setStatus('');
      hint('أُوقف.');
    } else {
      answer.innerHTML = '';
      const box = document.createElement('p');
      box.className = 'err-line';
      box.textContent = describeError(err);
      answer.append(box);
      setStatus('err');
      hint('فشل الطلب — راجع الرسالة.', 'bad');
      if (err.code === 'missing_key') openProviderSheet(p.id);
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
  const p = currentProvider();
  const s = err.status;
  if (s === 401) return `مفتاح ${p.name} غير صحيح أو منتهي.`;
  if (s === 402) return `رصيد ${p.name} غير كافٍ. جرّب مزوّداً مجانياً (Groq/Cerebras) أو أضف رصيداً.`;
  if (s === 429) return 'تجاوزت حدّ الطلبات. انتظر ثم أعد المحاولة.';
  if (s === 404) return 'الموديل غير متاح عند هذا المزوّد. أضف معرّفاً مخصصاً أو اختر مزوّداً آخر.';
  if (s === 403) return `رفض ${p.name} الطلب (مفتاح/منطقة/سياسة).`;
  if (s === 400) return `طلب مرفوض: ${err.message}`;
  if (err.code === 'missing_key') return `أضف مفتاح ${p.name}.`;
  if (err instanceof TypeError) return 'تعذّر الاتصال — غالباً CORS أو الشبكة. جرّب مزوّداً آخر.';
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
el.settingsBtn.onclick = () => {
  el.personaToggle.checked = state.persona;
  el.sysInput.value = state.system;
  el.settingsSheet.showModal();
};

el.settingsForm.addEventListener('submit', () => {
  if (el.saveSettings.value !== 'save') return;
  state.persona = el.personaToggle.checked;
  state.system = el.sysInput.value;
  persistPrefs();
  updateTopbar();
  updateGauge();
  toast('تم الحفظ');
});

el.clearAll.onclick = () => {
  state.messages = [];
  store.del(K.thread);
  renderThread();
  el.settingsSheet.close();
  toast('مُسحت المحادثة');
};

el.personaToggle.addEventListener('change', () => {
  el.personaChip.hidden = !el.personaToggle.checked;
});

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
  const head = `# محادثة عُمق\n\n- المزوّد: ${currentProvider().name}\n- الموديل: ${state.modelId}\n- الجهد: ${state.effort}\n- التاريخ: ${new Date().toISOString().slice(0, 10)}\n\n---\n\n`;
  const md = head + state.messages.map(m => `### ${m.role === 'user' ? 'أنا' : currentModel().name}\n\n${m.content}\n`).join('\n---\n\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `amq-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
};

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

/* ── بدء ──────────────────────────────────────────── */
(async function boot() {
  loadLocal();
  renderProviders();
  renderModels();
  updateTopbar();
  updateEffort();
  renderThread();
  updateToolBtns();
  el.skillsCount.textContent = String(state.skills.length);
  el.pluginsCount.textContent = String(state.plugins.length);
  el.skillMax.textContent = String(MAX_SKILLS);

  const has = await probeServer();
  const p = currentProvider();
  if (has) {
    hint('مفتاح الخادم مهيّأ — أنت جاهز.');
  } else if (p.kind !== 'local' && !keyOf(p.id)) {
    hint(`أضف مفتاح ${p.name} لتبدأ.`, 'warn');
    setTimeout(() => openProviderSheet(p.id), 700);
  } else {
    hint(p.kind === 'local' ? 'محلي — تأكد أن السيرفر شغّال.' : `${p.name} جاهز.`);
  }
})();
