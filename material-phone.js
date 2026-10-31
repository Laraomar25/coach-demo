/* Phone helper for training slides (added by the server; the original files are unchanged).
   Slides are fixed 16:9, so on a phone they only get big in landscape:
   - landscape phone: the research decks switch to their full-screen mode, and swiping changes slides.
   - portrait phone: a short tip asks to turn the phone.
   On any screen, the deck is kept inside the window width (its toolbar used to push the slide half off-screen). */
(() => {
  'use strict';
  // The decks draw themselves with JavaScript after the page loads, so wait until the slide appears.
  const start = () => {
    if (document.querySelector('.stage')) { init(); return; }
    const mo = new MutationObserver(() => { if (document.querySelector('.stage')) { mo.disconnect(); init(); } });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 8000);             // worksheets and summaries have no slides and already fit phones
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

function init() {
  const phone = matchMedia('(hover: none) and (pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const research = !!document.querySelector('.app .bar') && !!document.querySelector('.foot');
  const landscape = matchMedia('(orientation: landscape) and (max-height: 600px)');
  const portrait = matchMedia('(orientation: portrait)');

  const css = document.createElement('style');
  css.textContent = `
    .mp-tip{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99999;display:flex;align-items:center;gap:12px;
      padding:12px 14px;border-radius:14px;background:#0F3A2D;color:#F6EFE2;box-shadow:0 10px 30px rgba(0,0,0,.35);direction:rtl;
      font:600 14px/1.6 "IBM Plex Sans Arabic","Cairo",system-ui,sans-serif}
    .mp-tip svg{flex:none;width:30px;height:30px;color:#E8C48A}
    .mp-tip span{flex:1}
    .mp-tip button{flex:none;border:0;border-radius:999px;padding:7px 14px;background:#E8C48A;color:#0F3A2D;font:inherit;cursor:pointer}
    /* The deck's top toolbar is wider than a phone and pushed the slide half off-screen: keep everything inside the screen. */
    .app{grid-template-columns:minmax(0,1fr) !important}
    .app>*{min-width:0 !important}
    .bar,.foot{overflow-x:auto;scrollbar-width:none}
    .bar::-webkit-scrollbar,.foot::-webkit-scrollbar{display:none}
    @media (max-width: 760px){ .wrap{padding:.4rem 0 !important} .stage{border-radius:0 !important} }
    @media (orientation: landscape) and (max-height: 600px){
      html.mp-land .bar, html.mp-land .foot{display:none !important}
      html.mp-land .wrap{padding:0 !important;background:#13291F}
      html.mp-land .stage{width:min(100vw,calc(100vh*16/9)) !important;border-radius:0 !important}
    }`;
  document.head.appendChild(css);
  if (!phone) return;   // a narrow desktop window only needs the fit fix above

  /* landscape: full-screen slides */
  const applyLandscape = () => { if (research) document.documentElement.classList.toggle('mp-land', landscape.matches); };
  landscape.addEventListener('change', applyLandscape);
  applyLandscape();

  /* portrait: tip to rotate (once per page visit) */
  let tip = null, dismissed = false;
  const showTip = () => {
    if (dismissed || !portrait.matches) { if (tip) tip.hidden = true; return; }
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'mp-tip'; tip.setAttribute('role', 'status');
      tip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 12a9 9 0 0 1 4-7.5M21 12a9 9 0 0 1-4 7.5"/><path d="M3 8v4h4M21 16v-4h-4"/></svg>' +
        '<span>دوّري الجوال بالعرض لتكبر الشرائح.' + (research ? ' اسحبي بإصبعك للتنقل بين الشرائح.' : '') + '</span><button type="button">حسناً</button>';
      tip.querySelector('button').onclick = () => { dismissed = true; tip.hidden = true; };
      document.body.appendChild(tip);
    }
    tip.hidden = false;
  };
  portrait.addEventListener('change', showTip);
  showTip();

  /* swipe to change slides (research decks listen for arrow keys; the deck is RTL, so ArrowLeft = next) */
  if (!research) return;
  let x0 = 0, y0 = 0, t0 = 0, ok = false;
  addEventListener('touchstart', e => {
    const t = e.touches[0], el = e.target;
    ok = e.touches.length === 1 && !el.closest('input,textarea,select,[draggable="true"],[role="slider"],button,a');
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  addEventListener('touchend', e => {
    if (!ok) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - t0 > 700) return;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: dx > 0 ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
  }, { passive: true });
}
})();
