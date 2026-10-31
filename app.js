'use strict';
(() => {
/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth < 760;
const touchOnly = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
const isPhoneLike = () => narrow() || touchOnly();
const later = (fn, ms) => setTimeout(fn, reduce ? 0 : ms);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } },
};
const LOCALE = 'ar-u-nu-latn';

const P = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 9.5l3 2.5-3 2.5M11.5 15h6"/>',
  install: '<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  folder: '<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10.5h18"/>',
  network: '<circle cx="5.5" cy="6" r="2.3"/><circle cx="18.5" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M7.8 6h8.4M6.6 8l4.3 7.9M17.4 8l-4.3 7.9"/>',
  server: '<rect x="4" y="3.5" width="16" height="7" rx="1.6"/><rect x="4" y="13.5" width="16" height="7" rx="1.6"/><path d="M7.5 7h.01M7.5 17h.01M11 7h5.5M11 17h5.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.4"/>',
  spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16v4M16.5 18h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  chat: '<path d="M4 5.5h16v10.5H10l-5 4v-4H4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
  layers: '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M3 13l9 4.5 9-4.5"/>',
  doc: '<path d="M6.5 3h7.5l4 4v14h-11.5z"/><path d="M14 3v4h4M9.5 12h5.5M9.5 16h5.5"/>',
  live: '<circle cx="12" cy="12" r="2.2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8.5 8.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  next: '<path d="M15 6l-6 6 6 6"/>', prev: '<path d="M9 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', laptop: '<rect x="4" y="5" width="16" height="10.5" rx="1.5"/><path d="M2 19h20"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>', close: '<path d="M4 15h16M6 15l1-9h10l1 9"/>', tty: '<path d="M5 8l4 4-4 4M12 17h7"/>',
  open: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" ${P} aria-hidden="true">${ICONS[n] || ICONS.doc}</svg>`;

/* ---------- API ---------- */
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
async function api(path, { method = 'GET', json, body, headers = {} } = {}) {
  const h = { 'X-Coach': '1', ...headers };
  if (json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  let r;
  try { r = await fetch(path, { method, headers: h, body, credentials: 'same-origin' }); }
  catch (e) { throw new ApiError(0, 'تعذّر الاتصال بالخادم. تحقّقي من الإنترنت وجرّبي من جديد.'); }
  let data = null;
  try { data = await r.json(); } catch (e) { /* empty body */ }
  if (!r.ok) {
    if (r.status === 401 && path !== '/api/login') signedOut('انتهت الجلسة، ادخلي من جديد.');
    throw new ApiError(r.status, (data && data.error) || 'حدث خطأ غير متوقع');
  }
  return data;
}

/* ---------- state ---------- */
let SITE = location.origin;
let DATA = null;            // {user, courses, stickers, live} from the server
let pollTimer = null;
const S = { course: 0, live: false, term: false, zoom: false, lesson: null, closed: false, demo: false, unlocked: false };
const os = $('os'), stage = $('stage'), laptop = $('laptop'), screen = $('screen');
const main = os.querySelector('.main'), bar = os.querySelector('.bar');
const course = () => DATA && DATA.courses[S.course];
const doneCount = c => c.lessons.filter(l => l.done).length;
const liveOn = () => !!(DATA && DATA.live.live) || S.demo;
const isAdmin = () => !!(DATA && DATA.user.admin);
const LIVE = { name: 'قاعة التدريب المباشر', g: 'linear-gradient(135deg,#2a1020,#6b1f3a)' };

/* ---------- rendering ---------- */
function art(c, l, i, big) {
  return `<div class="art" style="--g:${esc(c.gradient)}">${l.image ? `<img src="${esc(l.image)}" alt="" loading="lazy" decoding="async">` : ic(l.icon)}${big ? '' : `<span class="no">${String(i + 1).padStart(2, '0')}</span>`}</div>`;
}
const courseIcon = c => c.image ? `<img src="${esc(c.image)}" alt="" decoding="async">` : ic(c.icon);

function renderSide() {
  if (!DATA) { $('side').innerHTML = ''; return; }
  const side = $('side');
  side.innerHTML = '<h4>الدورات</h4>' + DATA.courses.map((c, ci) =>
    `<button class="nav" type="button" data-c="${ci}" aria-current="${!S.live && !S.term && S.course === ci}"><span class="ic" style="--g:${esc(c.gradient)}">${courseIcon(c)}</span><span class="t">${esc(c.short)}</span><span class="c" aria-label="${doneCount(c)} من ${c.lessons.length}">${doneCount(c)}/${c.lessons.length}</span></button>`).join('') +
    `<h4 class="gap">أدوات</h4><button class="nav" type="button" data-term aria-current="${S.term}"><span class="ic" style="--g:#1C4134">${ic('tty')}</span><span class="t">التيرمينال</span></button>` +
    `<button class="nav" type="button" data-live aria-current="${S.live}"><span class="ic" style="--g:${LIVE.g}">${ic('live')}</span><span class="t">${LIVE.name}</span>${liveOn() ? '<span class="dot" aria-label="مباشر الآن"></span>' : ''}</button>`;
  side.querySelectorAll('.nav').forEach(b => b.onclick = () => {
    S.live = b.dataset.live !== undefined; S.term = b.dataset.term !== undefined;
    if (b.dataset.c !== undefined) S.course = +b.dataset.c;
    renderSide(); renderContent(); $('content').scrollTop = 0;
  });
}

function renderContent() {
  const el = $('content');
  if (!DATA) { el.innerHTML = ''; return; }
  if (S.term) { renderTerm(); return; }
  if (S.live) { renderLive(el); return; }
  const c = course();
  if (!c) { el.innerHTML = '<p class="empty">لا توجد دورات بعد. ستظهر هنا حين تضيفها المديرة.</p>'; return; }
  const n = doneCount(c), total = c.lessons.length;
  const tour = (S.course !== 0 || store.get('coach-tour')) ? '' :
    `<div class="tour"><b>جرّبي:</b><button class="btn" type="button" data-t="term">${ic('tty')} التيرمينال</button><button class="btn" type="button" data-t="live">${ic('live')} بث تجريبي</button><button class="btn" type="button" data-t="lid">${ic('close')} سكّري اللابتوب</button><button class="x" type="button" data-t="x" aria-label="إخفاء">${ic('x')}</button></div>`;
  el.innerHTML = tour + `<div class="hero" style="--g:${esc(c.gradient)}"><div class="big">${courseIcon(c)}</div><div class="txt"><small>دورة</small><h1>${esc(c.name)}</h1>
    <div class="chips">${c.meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>
    <div class="prog"><span class="b" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${total ? n / total * 100 : 0}%"></i></span>${n} من ${total}</div></div>
    ${isAdmin() ? `<button class="btn edit" type="button" id="coverBtn" title="صورة الدورة" aria-label="غيّري صورة الدورة">${ic('image')}</button>` : ''}</div>
    ${total ? `<div class="grid">${c.lessons.map((l, i) => `<button class="card" type="button" data-i="${i}">${l.done ? '<span class="badge">مكتمل</span>' : ''}${art(c, l, i)}<span class="meta"><span class="k">${esc(c.unit)} ${i + 1}</span><span class="n">${esc(l.title)}</span></span></button>`).join('')}</div>`
      : '<p class="empty">لا دروس في هذه الدورة بعد.</p>'}`;
  el.querySelectorAll('.card').forEach(b => b.onclick = () => openLesson(+b.dataset.i, b));
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = b.dataset.t;
    if (t === 'term') { S.term = true; S.live = false; renderSide(); renderContent(); }
    else if (t === 'live') setDemo(!S.demo);
    else if (t === 'lid') closeLid();
    else { store.set('coach-tour', '1'); renderContent(); }
  });
  if ($('coverBtn')) $('coverBtn').onclick = () => pickImage({ target: 'course', id: c.slug });
}

function renderLive(el) {
  const L = DATA.live, real = L.live, on = liveOn();
  const joinUrl = L.url || SITE;
  el.innerHTML = `<div class="hero" style="--g:${LIVE.g}"><div class="big">${ic('live')}</div><div class="txt"><small>مباشر</small><h1>${esc(real && L.title ? L.title : LIVE.name)}</h1><div class="chips"><span>${real ? 'مباشر الآن' : S.demo ? 'بث تجريبي' : 'لا جلسة الآن'}</span></div></div></div>
    <div class="live"><p>الجلسات المباشرة مع المدرّبة. حين تبدأ جلسة، يرنّ الموبايل الذي على الطاولة ويظهر إشعار هنا.</p>
    <div class="acts">${real ? `<a class="btn primary" href="${esc(joinUrl)}" target="_blank" rel="noopener">${ic('open')} ادخلي القاعة</a>` : ''}
    <button class="btn" id="liveDemo" type="button">تجربة: ${S.demo ? 'أوقفي' : 'ابدئي'} البث</button></div>
    ${isAdmin() ? `<form class="admin-box" id="liveForm"><h3>للمديرة: الجلسة الحقيقية</h3>
      <label class="sr" for="liveTitle">عنوان الجلسة</label><input id="liveTitle" maxlength="120" placeholder="عنوان الجلسة (اختياري)" value="${esc(L.title)}">
      <label class="sr" for="liveUrl">رابط الجلسة</label><input id="liveUrl" type="url" placeholder="https://..." value="${esc(L.url)}">
      <div class="acts"><button class="btn primary" type="submit">${real ? 'أوقفي الجلسة' : 'ابدئي الجلسة للجميع'}</button></div></form>` : ''}</div>`;
  $('liveDemo').onclick = () => setDemo(!S.demo);
  if ($('liveForm')) $('liveForm').onsubmit = async e => {
    e.preventDefault();
    const was = liveOn();
    try {
      DATA.live = await api('/api/admin/live', { method: 'POST', json: { live: !real, title: $('liveTitle').value.trim(), url: $('liveUrl').value.trim() } });
      applyLive(was);
    } catch (err) { toast(err.message); }
  };
}

/* ---------- lesson window ---------- */
let lastFocus = null;
function openLesson(i, from) {
  const c = course(), l = c && c.lessons[i];
  if (!l) return;
  if (from) lastFocus = from;
  S.lesson = i;
  $('panel').innerHTML = `<div class="tb"><span>${esc(c.short)} · ${esc(c.unit)} ${i + 1} من ${c.lessons.length}</span>
    <button class="icon-btn" id="pv" type="button" aria-label="السابق" ${i === 0 ? 'disabled' : ''}>${ic('prev')}</button>
    <button class="icon-btn" id="nx" type="button" aria-label="التالي" ${i === c.lessons.length - 1 ? 'disabled' : ''}>${ic('next')}</button>
    <button class="icon-btn x" id="cl" type="button" aria-label="إغلاق">${ic('x')}</button></div>
    ${art(c, l, i, true)}
    <div class="pn-body"><h2 id="lessonTitle">${esc(l.title)}</h2><p>${esc(l.description || `محتوى ${c.unit === 'الوحدة' ? 'الوحدة' : 'الدرس'}: الفيديو والشرائح والتمارين.`)}</p>
    <div class="acts">${l.url ? `<a class="btn primary" href="${esc(l.url)}" target="_blank" rel="noopener">${ic('open')} ابدئي الدرس</a>` : `<span class="btn primary" aria-disabled="true">${ic('open')} الرابط لم يُضف بعد</span>`}
    <button class="btn" id="mk" type="button" aria-pressed="${l.done}">${ic('check')} ${l.done ? 'إلغاء الإكمال' : 'علّميه مكتمل'}</button>
    ${isAdmin() ? `<button class="btn" id="im" type="button">${ic('image')} ${l.image ? 'غيّري الصورة' : 'أضيفي صورة'}</button>${l.image ? `<button class="btn" id="rm" type="button">${ic('trash')} احذفي الصورة</button>` : ''}` : ''}</div></div>`;
  $('win').classList.add('on');
  $('cl').onclick = closeLesson;
  $('pv').onclick = () => openLesson(i - 1);
  $('nx').onclick = () => openLesson(i + 1);
  $('mk').onclick = async () => { $('mk').disabled = true; await toggleDone(l); if (S.lesson === i) openLesson(i); };
  if ($('im')) $('im').onclick = () => pickImage({ target: 'lesson', id: l.id });
  if ($('rm')) $('rm').onclick = () => removeImage({ target: 'lesson', id: l.id });
  $('cl').focus({ preventScroll: true });
}
function closeLesson() {
  if (!$('win').classList.contains('on')) return;
  $('win').classList.remove('on'); S.lesson = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}
$('win').addEventListener('click', e => { if (e.target.id === 'win') closeLesson(); });
$('win').addEventListener('keydown', e => {   // keep Tab inside the window
  if (e.key !== 'Tab') return;
  const f = [...$('panel').querySelectorAll('a[href],button:not([disabled])')];
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('qrm').hidden) hideQR(); else closeLesson(); } });

/* ---------- images (admin) ---------- */
let pending = null;
function pickImage(target) { pending = target; $('file').value = ''; $('file').click(); }
function resize(file) {  // shrink large photos in the browser before upload; keep GIFs as they are
  if (file.type === 'image/gif') return Promise.resolve(file);
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onerror = () => fail(new Error('تعذّرت قراءة الصورة'));
    r.onload = () => {
      const im = new Image();
      im.onerror = () => fail(new Error('هذا الملف ليس صورة صالحة'));
      im.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cv.toBlob(b => b ? ok(b) : fail(new Error('تعذّر تجهيز الصورة')), 'image/jpeg', 0.85);
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
function setImage(target, url) {
  if (target.target === 'course') { const c = DATA.courses.find(x => x.slug === target.id); if (c) c.image = url; }
  else DATA.courses.forEach(c => c.lessons.forEach(l => { if (l.id === target.id) l.image = url; }));
  renderSide(); if (!S.term) renderContent(); if (S.lesson !== null) openLesson(S.lesson);
}
$('file').onchange = async e => {
  const f = e.target.files[0], target = pending;
  if (!f || !target) return;
  try {
    toast('جارٍ رفع الصورة…');
    const blob = await resize(f);
    const res = await api(`/api/admin/image?target=${target.target}&id=${encodeURIComponent(target.id)}`, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
    setImage(target, res.image); toast('حُفظت الصورة على الخادم');
  } catch (err) { toast(err.message); }
};
async function removeImage(target) {
  try { await api(`/api/admin/image?target=${target.target}&id=${encodeURIComponent(target.id)}`, { method: 'DELETE' }); setImage(target, null); toast('حُذفت الصورة'); }
  catch (err) { toast(err.message); }
}

let tt;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2600); }

/* ---------- progress + stickers ---------- */
async function toggleDone(lesson) {
  let res;
  try { res = await api('/api/progress', { method: 'POST', json: { lesson_id: lesson.id, done: !lesson.done } }); }
  catch (err) { toast(err.message); return null; }
  DATA.courses = res.courses; DATA.stickers = res.stickers;
  renderSide(); if (!S.term) renderContent();
  renderStickers(res.new_sticker);
  if (res.new_sticker) toast('أنهيتِ الدورة! انلصق ملصقها على ظهر اللابتوب');
  return res;
}
const SPOTS = [{ x: 14, y: 16, r: -14 }, { x: 66, y: 56, r: 9 }, { x: 20, y: 60, r: 6 }, { x: 64, y: 12, r: -6 }, { x: 42, y: 38, r: 12 }, { x: 80, y: 32, r: -10 }];
function renderStickers(fresh) {
  const back = $('lidBack');
  back.querySelectorAll('.stk').forEach(n => n.remove());
  if (!DATA) return;
  const earned = DATA.stickers.map(s => DATA.courses.find(c => c.slug === s)).filter(Boolean);
  const size = earned.length <= 3 ? .13 : earned.length <= 6 ? .11 : .085;
  earned.forEach((c, i) => {
    const s = SPOTS[i] || { x: 8 + (i * 37) % 72, y: 8 + (i * 23) % 62, r: (i * 53) % 30 - 15 };
    const d = document.createElement('div');
    d.className = 'stk' + (c.slug === fresh ? ' new' : '');
    d.style.cssText = `left:${s.x}%;top:${s.y}%;--r:${s.r}deg;--s:${size};--g:${c.gradient}`;
    d.innerHTML = `${ic(c.icon)}<b>${esc(c.short)}</b>`;
    back.appendChild(d);
  });
}

/* ---------- live session + phone ---------- */
function setDemo(v) { const was = liveOn(); S.demo = v; applyLive(was); }
function applyLive(wasOn) {
  const on = liveOn();
  $('phone').classList.toggle('ring', on && !reduce);
  renderPhone(); renderSide(); if (!S.term) renderContent();
  if (on && !wasOn) toast(DATA.live.live ? 'المدرّبة بدأت البث المباشر! ادخلي القاعة.' : 'بث تجريبي: الموبايل يرنّ الآن');
}
async function pollLive() {
  if (!DATA || document.hidden) return;
  try { const was = liveOn(); DATA.live = await api('/api/live'); if (was !== liveOn() || S.live) applyLive(was); }
  catch (e) { /* try again next tick */ }
}
function startPolling() { stopPolling(); pollTimer = setInterval(pollLive, 30000); }
function stopPolling() { clearInterval(pollTimer); pollTimer = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollLive(); });

function renderPhone() {
  const d = new Date();
  $('phScreen').innerHTML = liveOn() ? '<span class="t">● مباشر</span><small>المدرّبة بدأت البث. المسيني</small>' :
    `<span class="t">${d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: false })}</span><small>المسيني لتكملي من موبايلك</small>`;
}
let qrMade = false;
function showQR() {
  if (isPhoneLike()) return;            // never on a phone
  if (!qrMade && window.QRCode) { new QRCode($('qrBox'), { text: SITE, width: 170, height: 170, colorDark: '#0F3A2D', colorLight: '#ffffff' }); qrMade = true; }
  $('qrUrl').textContent = SITE.replace(/^https?:\/\//, '');
  $('qrm').hidden = false; $('qrClose').focus();
}
function hideQR() { $('qrm').hidden = true; }
$('phone').addEventListener('click', e => { e.stopPropagation(); showQR(); });
$('phoneBtn').onclick = showQR;
$('qrClose').onclick = hideQR;
$('qrm').addEventListener('click', e => { if (e.target.id === 'qrm') hideQR(); });

/* ---------- lock screen = login ---------- */
function showLockView(user, msg) {
  $('loginForm').hidden = !!user; $('unlock').hidden = !user;
  $('loginErr').textContent = msg || '';
  if (user) $('hello').textContent = `أهلاً، ${user.name}`;
}
function lockShow() {
  S.unlocked = false; $('lock').classList.remove('off');
  main.inert = true; bar.inert = true;
  showLockView(DATA && DATA.user);
}
function unlock() {
  S.unlocked = true; $('lock').classList.add('off');
  main.inert = false; bar.inert = false;
  $('who').textContent = `أهلاً، ${DATA.user.name}`;
  S.course = Math.min(S.course, Math.max(0, DATA.courses.length - 1));
  renderSide(); renderContent(); renderStickers(); applyLive(true);
  startPolling();
  toast(`أهلاً يا ${DATA.user.name}، كمّلي من حيث توقفتِ`);
}
function signedOut(msg) {
  DATA = null; stopPolling(); S.demo = false; closeLesson();
  renderSide(); renderContent(); renderStickers();
  $('who').textContent = ''; $('phone').classList.remove('ring'); renderPhone();
  if (!S.closed) { lockShow(); showLockView(null, msg); }
}
$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const email = $('email').value.trim(), password = $('password').value;
  if (!email || !password) { $('loginErr').textContent = 'اكتبي البريد وكلمة المرور.'; return; }
  $('loginBtn').disabled = true; $('loginErr').textContent = '';
  try { DATA = await api('/api/login', { method: 'POST', json: { email, password } }); $('password').value = ''; unlock(); }
  catch (err) { $('loginErr').textContent = err.message; }
  finally { $('loginBtn').disabled = false; }
};
$('unlockForm').onsubmit = async e => {
  e.preventDefault();
  try { DATA = await api('/api/state'); unlock(); }
  catch (err) { if (err.status !== 401) $('loginErr').textContent = err.message; }
};
$('logoutBtn').onclick = async () => { try { await api('/api/logout', { method: 'POST' }); } catch (e) { /* signed out locally anyway */ } signedOut(); };

/* ---------- terminal ---------- */
let cwd = null, hist = [], hi = 0, tlog = [];
const ar = t => `<span class="ar" dir="rtl">${esc(t)}</span>`;
const user = () => ((DATA && DATA.user.email.split('@')[0]) || 'student').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'student';
const ps = () => `<span class="p">${esc(user())}@academy</span>:<span class="d">~${cwd ? '/' + esc(cwd) : ''}</span>$`;
const COMMANDS = ['help', 'ls', 'cd', 'open', 'done', 'progress', 'live', 'whoami', 'clear', 'shutdown', 'sudo'];
const courseIdx = slug => DATA.courses.findIndex(c => c.slug === slug);
function out(h) { tlog.push(h); if (tlog.length > 400) tlog.shift(); const o = $('tout'); if (o) { o.insertAdjacentHTML('beforeend', `<div class="ln">${h}</div>`); $('term').scrollTop = 1e9; } }
function renderTerm() {
  $('content').innerHTML = `<div class="term" id="term"><div id="tout">${tlog.map(h => `<div class="ln">${h}</div>`).join('')}</div><form id="tform"><label class="sr" for="tin">أمر</label><span id="tps">${ps()}</span><input id="tin" dir="auto" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send"></form></div>`;
  if (!tlog.length) { out(`<span class="y">academy-os 1.0</span>  ${ar('أهلاً! هذا تيرمينال المنصّة. تنقّلي بين الدورات بالأوامر.')}`); out(`${ar('اكتبي')} <span class="y">help</span>`); }
  $('term').onclick = () => $('tin').focus();
  $('tform').onsubmit = async e => { e.preventDefault(); const v = $('tin').value; $('tin').value = ''; await run(v); };
  $('tin').onkeydown = e => {
    if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); $('tin').value = hist[hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); $('tin').value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
  };
  if (!isPhoneLike()) $('tin').focus({ preventScroll: true });
}
function complete() {
  const inp = $('tin'), v = inp.value;
  let m = v.match(/^cd\s+(\S*)$/);
  if (m) {
    const opts = [...DATA.courses.map(c => c.slug), 'live', '..'].filter(d => d.startsWith(m[1]));
    if (opts.length === 1) inp.value = 'cd ' + opts[0];
    else if (opts.length > 1) out(opts.map(o => `<span class="d">${esc(o)}</span>`).join('  '));
    return;
  }
  m = v.match(/^(\S*)$/);
  if (m && m[1]) { const opts = COMMANDS.filter(c => c.startsWith(m[1])); if (opts.length === 1) inp.value = opts[0] + ' '; else if (opts.length > 1) out(opts.join('  ')); }
}
async function run(raw) {
  const v = raw.trim();
  out(`${ps()} <bdi>${esc(v)}</bdi>`);
  if (!v) return;
  hist.push(v); hi = hist.length;
  const [cmd, ...a] = v.split(/\s+/), arg = a.join(' ');
  const here = cwd ? DATA.courses[courseIdx(cwd)] : null;
  switch (cmd) {
    case 'help':
      out([['ls', 'عرض الدورات، أو دروس الدورة الحالية'], ['cd ubuntu', 'الدخول إلى دورة'], ['cd ..', 'الرجوع'], ['open 2', 'فتح الدرس رقم 2'], ['done 2', 'تعليم الدرس مكتملاً أو إلغاء ذلك'], ['progress', 'التقدّم في كل الدورات'], ['live', 'حالة الجلسة المباشرة'], ['live demo', 'تشغيل بث تجريبي أو إيقافه'], ['whoami', 'من أنا'], ['shutdown', 'سكّري اللابتوب'], ['clear', 'مسح الشاشة']]
        .map(([c, d]) => `  <span class="y">${c.padEnd(11)}</span>${ar(d)}`).join('\n'));
      break;
    case 'ls':
      if (!here) {
        if (!DATA.courses.length) out(ar('لا توجد دورات بعد.'));
        else out(DATA.courses.map(c => `<span class="d">${esc((c.slug + '/').padEnd(10))}</span> ${ar(c.name)}`).join('\n') +
          `\n<span class="d">${'live/'.padEnd(10)}</span> ${ar(LIVE.name)} <span class="m">[${liveOn() ? 'on air' : 'offline'}]</span>`);
      } else if (!here.lessons.length) out(ar('لا دروس في هذه الدورة بعد.'));
      else out(here.lessons.map((l, i) => `  ${l.done ? '<span class="p">[✓]</span>' : '<span class="m">[ ]</span>'} ${String(i + 1).padStart(2, '0')}  ${ar(l.title)}`).join('\n'));
      break;
    case 'cd':
      if (!arg || arg === '~' || arg === '..' || arg === '/') cwd = null;
      else {
        const id = arg.replace(/\/$/, '');
        if (id === 'live') { out(ar(liveOn() ? 'القاعة مفتوحة الآن! افتحيها من «قاعة التدريب المباشر».' : 'لا جلسة الآن. جرّبي: live demo')); break; }
        if (courseIdx(id) < 0) { out(`<span class="e">cd: ${esc(id)}</span>  ${ar('لا توجد دورة بهذا الاسم. اكتبي ls لتري الدورات.')}`); break; }
        cwd = id; S.course = courseIdx(id); renderSide();
      }
      $('tps').innerHTML = ps();
      break;
    case 'open': case 'done': {
      if (!here) { out(`<span class="e">${cmd}: </span>` + ar('ادخلي إلى دورة أولاً، مثلاً: cd ubuntu')); break; }
      const n = +arg;
      if (!(Number.isInteger(n) && n >= 1 && n <= here.lessons.length)) { out(`<span class="e">${cmd}: </span>` + ar(`اختاري رقماً من 1 إلى ${here.lessons.length}`)); break; }
      const l = here.lessons[n - 1];
      if (cmd === 'open') { out(`<span class="m">opening…</span> ${ar(l.title)}`); openLesson(n - 1); break; }
      const res = await toggleDone(l);
      if (!res) { out(`<span class="e">done: </span>` + ar('تعذّر الحفظ. جرّبي من جديد.')); break; }
      const now = DATA.courses[courseIdx(here.slug)].lessons[n - 1];
      out(now.done ? `<span class="p">✓</span> ${ar(now.title)}` : `<span class="m">○</span> ${ar(now.title)}`);
      if (res.new_sticker) out('<span class="y">★ </span>' + ar('أنهيتِ الدورة كلها! سكّري اللابتوب (shutdown) وشوفي الملصق.'));
      break;
    }
    case 'progress':
      if (!DATA.courses.length) { out(ar('لا توجد دورات بعد.')); break; }
      out(DATA.courses.map(c => {
        const k = doneCount(c), t = c.lessons.length, w = t ? Math.round(k / t * 12) : 0;
        return `<span class="d">${esc(c.slug.padEnd(8))}</span> <span class="p">${'█'.repeat(w)}</span><span class="m">${'░'.repeat(12 - w)}</span> ${k}/${t}`;
      }).join('\n'));
      break;
    case 'live':
      if (arg === 'demo') { setDemo(!S.demo); out(S.demo ? '<span class="e">● on air (demo)</span>  ' + ar('بث تجريبي: الموبايل على الطاولة يرنّ') : '<span class="m">● demo off</span>'); }
      else out(DATA.live.live ? '<span class="e">● on air</span>  ' + ar(DATA.live.title || 'المدرّبة تبثّ الآن') : '<span class="m">● offline</span>  ' + ar('لا جلسة الآن'));
      break;
    case 'whoami': out(esc(user()) + '  ' + ar(DATA.user.name)); break;
    case 'clear': tlog = []; $('tout').innerHTML = ''; break;
    case 'shutdown': case 'exit': out('<span class="m">bye 👋</span>'); setTimeout(closeLid, 500); break;
    case 'sudo': out(ar('حلوة المحاولة 😄 الصلاحيات في درس «المستخدمون والصلاحيات».')); break;
    default: out(`<span class="e">${esc(cmd)}: command not found</span>  ${ar('هذا الأمر غير معروف. اكتبي help')}`);
  }
}

/* ---------- laptop <-> full screen ---------- */
function sizeLaptop() {
  const vw = innerWidth, vh = innerHeight;
  // As large as fits: on desktop the phone beside the laptop limits the width, the deck limits the height.
  const w = vw < 760 ? Math.min(vw * .92, vh * .9) : Math.min(1500, vw * .57, vh * .9);
  stage.style.setProperty('--w', w + 'px');  // the 3D depth scales with the laptop, so it never stretches off-screen
  laptop.style.top = (vh * .035) + 'px';
}
function setOSVisible(v) { os.classList.toggle('show', v); os.inert = !v; }
function placeOS() {
  $('zoomBtn').innerHTML = S.zoom ? `${ic('laptop')}<span class="lbl">عرض اللابتوب</span>` : `${ic('expand')}<span class="lbl">ملء الشاشة</span>`;
  $('zoomBtn').setAttribute('aria-label', S.zoom ? 'عرض اللابتوب' : 'ملء الشاشة');
  if (S.zoom) { os.classList.add('zoom'); os.style.cssText = ''; return; }
  os.classList.remove('zoom');
  const r = screen.getBoundingClientRect(), VW = Math.max(r.width, 1000), k = r.width / VW;
  os.style.cssText = `left:${r.left}px;top:${r.top}px;width:${VW}px;height:${r.height / k}px;transform:scale(${k});border-radius:${3 / k}px`;
}
function setZoom(z, show = true) {
  if (z === S.zoom) return;
  S.zoom = z; setOSVisible(false);
  if (z) {
    const r = screen.getBoundingClientRect(), k = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.15;
    stage.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    stage.style.transform = `scale(${k})`; stage.classList.add('dive');
    later(() => { placeOS(); setOSVisible(true); }, 600);
  } else {
    stage.style.transform = ''; stage.classList.remove('dive');
    later(() => { placeOS(); if (show) setOSVisible(true); }, 900);
  }
}
function closeLid() {
  if (S.closed) return;
  closeLesson(); hideQR();
  const go = () => {
    setOSVisible(false); S.closed = true;
    later(() => { stage.classList.remove('open'); stage.classList.add('closed'); $('hint').hidden = false; $('hint').focus({ preventScroll: true }); }, 350);
  };
  if (S.zoom) { setZoom(false, false); later(go, 950); } else go();
}
function afterOpen() {
  placeOS(); setOSVisible(true);
  if (!S.unlocked && !narrow() && !$('loginForm').hidden) $('email').focus({ preventScroll: true });
  if (narrow()) later(() => setZoom(true), 700);
}
function openLid() {
  if (!S.closed) return;
  S.closed = false; $('hint').hidden = true; stage.classList.remove('closed');
  lockShow(); stage.classList.add('open');
  setTimeout(afterOpen, reduce ? 50 : 2100);
}
stage.addEventListener('click', openLid);
$('hint').onclick = openLid;
$('lidBtn').onclick = closeLid;
$('zoomBtn').onclick = () => setZoom(!S.zoom);
// In laptop view on a narrow screen the app is too small to use: the first tap dives in.
os.addEventListener('click', e => { if (!S.zoom && narrow()) { e.preventDefault(); e.stopPropagation(); setZoom(true); } }, true);
let rz;
addEventListener('resize', () => {
  cancelAnimationFrame(rz);
  rz = requestAnimationFrame(() => {
    sizeLaptop();
    $('phoneBtn').hidden = isPhoneLike();
    if (isPhoneLike()) hideQR();
    if (!S.zoom) placeOS();
    if (narrow() && !S.zoom && !S.closed && os.classList.contains('show')) setZoom(true);
  });
});

function tickClock() {
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  $('lockTime').textContent = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: false });
  $('lockDate').textContent = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  renderPhone();
}

/* ---------- boot ---------- */
async function boot() {
  tickClock(); setInterval(tickClock, 30000);
  sizeLaptop(); setOSVisible(false); lockShow();
  $('phoneBtn').hidden = isPhoneLike();
  $('lidBtn').innerHTML = `${ic('close')}<span class="lbl">سكّري</span>`;
  placeOS();
  later(() => stage.classList.add('open'), 350);
  const ready = Promise.all([
    api('/api/config').then(c => { if (c && c.site) SITE = c.site; }).catch(() => {}),
    api('/api/me').then(r => { if (r && r.user) DATA = { user: r.user, courses: [], stickers: [], live: { live: false } }; }).catch(() => {}),
  ]);
  setTimeout(async () => {
    await ready;
    // A signed-in user gets "افتحي" instead of the login form; their data loads on unlock.
    showLockView(DATA && DATA.user);
    if (DATA) { try { DATA = await api('/api/state'); renderStickers(); applyLive(true); } catch (e) { /* lock screen handles it */ } }
    afterOpen();
  }, reduce ? 50 : 2600);
}
boot();
})();
