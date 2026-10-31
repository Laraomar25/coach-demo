/* Demo version: there is no server here. This file answers the platform's
   /api/* requests inside the browser, and keeps progress in localStorage. */
(() => {
  const KEY = 'coach-demo-v1';
  const USER = { name: 'زائرة', email: 'demo@coach.lara', admin: true };

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } };
  const st = Object.assign({ signedIn: false, done: [], stickers: [], live: { live: false, title: '', url: '', since: null } }, load());
  const images = {}; // uploaded images live only until the page reloads

  function buildState() {
    const done = new Set(st.done);
    const courses = window.DEMO_COURSES.map(c => ({
      ...c,
      image: images['course:' + c.slug] || null,
      lessons: c.lessons.map(l => ({ ...l, done: done.has(l.id), image: images['lesson:' + l.id] || null })),
    }));
    return { user: USER, courses, stickers: st.stickers.slice(), live: { ...st.live } };
  }

  const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const realFetch = window.fetch.bind(window);

  async function handle(path, opts) {
    const url = new URL(path, location.href);
    const route = url.pathname.replace(/^.*\/api\//, '');
    const method = (opts.method || 'GET').toUpperCase();
    const body = () => { try { return JSON.parse(opts.body || '{}'); } catch (e) { return {}; } };

    if (route === 'config') return reply(200, { site: null });
    if (route === 'me') return reply(200, { user: st.signedIn ? USER : null });
    if (route === 'login' && method === 'POST') {
      const b = body();
      if (!b.email || !b.password) return reply(401, { error: 'اكتبي أي بريد وكلمة مرور للتجربة' });
      st.signedIn = true; save(st);
      return reply(200, buildState());
    }
    if (route === 'logout') { st.signedIn = false; save(st); return reply(200, { ok: true }); }
    if (!st.signedIn) return reply(401, { error: 'انتهت الجلسة، ادخلي من جديد.' });

    if (route === 'state') return reply(200, buildState());
    if (route === 'live') return reply(200, { ...st.live });

    if (route === 'progress' && method === 'POST') {
      const b = body(), id = Number(b.lesson_id);
      const course = window.DEMO_COURSES.find(c => c.lessons.some(l => l.id === id));
      if (!course) return reply(404, { error: 'الدرس غير موجود' });
      st.done = st.done.filter(x => x !== id);
      if (b.done) st.done.push(id);
      let newSticker = null;
      if (b.done && course.lessons.every(l => st.done.includes(l.id)) && !st.stickers.includes(course.slug)) {
        st.stickers.push(course.slug); newSticker = course.slug;
      }
      save(st);
      const s = buildState();
      return reply(200, { new_sticker: newSticker, stickers: s.stickers, courses: s.courses });
    }

    if (route === 'admin/live' && method === 'POST') {
      const b = body();
      if (b.url && !/^https?:\/\//.test(b.url)) return reply(400, { error: 'رابط الجلسة يجب أن يبدأ بـ http أو https' });
      st.live = { live: !!b.live, title: b.title ?? st.live.title, url: b.url ?? st.live.url, since: b.live ? Math.floor(Date.now() / 1000) : null };
      save(st);
      return reply(200, { ...st.live });
    }

    if (route === 'admin/image') {
      const key = url.searchParams.get('target') + ':' + url.searchParams.get('id');
      if (images[key]) URL.revokeObjectURL(images[key]);
      if (method === 'PUT') { images[key] = URL.createObjectURL(opts.body); return reply(200, { image: images[key] }); }
      delete images[key];
      return reply(200, { image: null });
    }

    return reply(404, { error: 'غير موجود' });
  }

  window.fetch = (input, opts = {}) => {
    const path = typeof input === 'string' ? input : input.url;
    return /^\/api\//.test(path) ? handle(path, opts) : realFetch(input, opts);
  };
})();
