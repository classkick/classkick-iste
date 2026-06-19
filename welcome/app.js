(() => {
  const C = window.CONFIG || {};

  /* ---- wire config text into every [data-config="<key>"] element ---- */
  document.querySelectorAll("[data-config]").forEach(el => {
    const v = C[el.dataset.config];
    if (v != null) el.textContent = v;
  });

  /* ---- wire config links; "#" placeholders are left alone so the
         in-page anchor scroll keeps working until a real link is set. ---- */
  [
    ['[data-cta="hunt"]', C.scavengerHuntUrl],
    ['[data-cta="founder"]', C.founderChatUrl],
    ['[data-leaderboard]', C.leaderboardUrl],
  ].forEach(([sel, url]) => {
    if (!url || url === "#") return;
    document.querySelectorAll(sel).forEach(a => {
      a.href = url; a.target = "_blank"; a.rel = "noopener";
    });
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- reveal-on-scroll ---- */
  const reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => io.observe(el));
  }

  /* ---- confetti: a welcome burst + a burst on the primary CTAs ---- */
  const canvas = document.getElementById("confetti");
  const ctx = canvas && canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  let pieces = [], raf = null;
  const COLORS = ["#25c582", "#88c043", "#ffdf78", "#3498fe", "#ff6b6b", "#723dff", "#ffbd7b"];

  function size() {
    if (!canvas) return;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  size();
  window.addEventListener("resize", size);

  function burst(n, originX) {
    if (!ctx || reduce) return;
    const x = (originX ?? window.innerWidth / 2) * dpr;
    const y = -20;
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: x + (Math.random() - 0.5) * 220 * dpr,
        y: y + Math.random() * 40,
        vx: (Math.random() - 0.5) * 6 * dpr,
        vy: (Math.random() * 3 + 2) * dpr,
        w: (Math.random() * 8 + 5) * dpr,
        h: (Math.random() * 5 + 4) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
        life: 0,
      });
    }
    if (!raf) tick();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += 0.12 * dpr;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    pieces = pieces.filter(p => p.y < canvas.height + 40 && p.life < 360);
    raf = pieces.length ? requestAnimationFrame(tick) : null;
  }

  // welcome burst shortly after load
  if (!reduce) setTimeout(() => burst(140), 400);

  // burst from the button position when a primary CTA is clicked
  document.querySelectorAll(".btn-primary").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const r = btn.getBoundingClientRect();
      burst(90, r.left + r.width / 2);
    });
  });
})();
