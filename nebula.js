// Ambient particle field: drifting glow dust with depth, constellation links, cursor vortex.
// startNebula(canvas, { mode: 'nebula' | 'embers', density }) -> stop()
window.startNebula = function startNebula(canvas, opts = {}) {
  const mode = opts.mode ?? 'nebula';
  const N = Math.round(opts.density ?? 140);
  const palette = opts.palette ?? [[120, 190, 255], [255, 120, 80], [230, 238, 255]];
  const linkRGB = opts.linkColor ?? '140,185,255';
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sprites = palette.map(([r, g, b]) => {
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const g2 = s.getContext('2d'), grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`); grad.addColorStop(0.18, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`); grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64); return s;
  });
  let W = 0, H = 0, raf = 0, last = performance.now(), t = 0;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0, want: 0 };
  const dots = [];
  const spawn = (p, fresh) => {
    p.z = rnd(0.25, 1); p.x = rnd(0, W); p.y = fresh ? rnd(0, H) : H + 20;
    p.r = rnd(0.7, 1.9) * p.z; p.by = -rnd(0.1, 0.4) * p.z; p.vx = 0; p.vy = 0;
    p.a = rnd(0, 6.28); p.tw = rnd(0.6, 2); p.ph = rnd(0, 6.28);
    const k = Math.random(); p.k = mode === 'embers' ? (k < 0.85 ? 1 : 2) : (k < 0.62 ? 0 : k < 0.85 ? 1 : 2);
    return p;
  };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), nW = window.innerWidth, nH = window.innerHeight;
    if (W && H) dots.forEach(p => { p.x *= nW / W; p.y *= nH / H; });
    W = nW; H = nH; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  for (let i = 0; i < N; i++) dots.push(spawn({}, true));
  const onMove = (e) => {
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.want = 1;
    if (mouse.x < -999) { mouse.x = e.clientX; mouse.y = e.clientY; }
  };
  const onLeave = () => { mouse.want = 0; };
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  const step = (now) => {
    const dt = Math.max(0.01, Math.min((now - last) / 16.67, 2.5)); last = now; t += dt / 60;
    mouse.x += (mouse.tx - mouse.x) * 0.18 * dt; mouse.y += (mouse.ty - mouse.y) * 0.18 * dt;
    mouse.on += (mouse.want - mouse.on) * 0.08 * dt;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const R = 190, damp = Math.pow(0.93, dt);
    const parX = (mouse.x - W / 2) * 0.025 * mouse.on, parY = (mouse.y - H / 2) * 0.025 * mouse.on;
    for (const p of dots) {
      p.a += 0.012 * dt;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < R * R && mouse.on > 0.01) {
        const d = Math.sqrt(d2) || 1, f = (1 - d / R) * mouse.on * p.z;
        p.vx += (-dy / d * 0.55 - dx / d * 0.1) * f * dt;
        p.vy += (dx / d * 0.55 - dy / d * 0.1) * f * dt;
      }
      p.vx *= damp; p.vy *= damp;
      p.x += (p.vx + Math.sin(p.a * 2 + p.ph) * 0.18 * p.z) * dt;
      p.y += (p.vy + p.by) * dt;
      if (p.y < -30) { p.y = H + 30; p.x = rnd(0, W); } else if (p.y > H + 40) p.y = -30;
      if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;
      p.sx = p.x + parX * p.z; p.sy = p.y + parY * p.z;
    }
    if (mode !== 'embers') {
      const L = 110; ctx.lineWidth = 1;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j], dx = a.sx - b.sx, dy = a.sy - b.sy, d2 = dx * dx + dy * dy;
          if (d2 < L * L) {
            ctx.strokeStyle = `rgba(${linkRGB},${((1 - Math.sqrt(d2) / L) * 0.42 * Math.min(a.z, b.z)).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
          }
        }
      }
    }
    for (const p of dots) {
      const s = p.r * 11;
      ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t * p.tw * 2 + p.ph)) * 0.75 * p.z + 0.1;
      ctx.drawImage(sprites[p.k], p.sx - s / 2, p.sy - s / 2, s, s);
    }
    if (mouse.on > 0.01) { const s = 320; ctx.globalAlpha = 0.16 * mouse.on; ctx.drawImage(sprites[mode === 'embers' ? 1 : 0], mouse.x - s / 2, mouse.y - s / 2, s, s); }
    ctx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
};
