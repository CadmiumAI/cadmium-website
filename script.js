// ─── CAD-themed particle canvas ───
(function () {
  const canvas = document.getElementById("cad-canvas");
  const ctx = canvas.getContext("2d");
  let W, H;
  let mouse = { x: -1000, y: -1000 };
  const ACCENT = "rgba(0,212,255,";
  const DIM = "rgba(255,255,255,";
  const particles = [];
  const PARTICLE_COUNT = 60;
  const MOUSE_RADIUS = 200;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // ─── Particle types ───

  // Draw a dimension line with tick marks and a measurement
  function drawDimension(ctx, x, y, rot, len, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const half = len / 2;
    const tick = 6;

    // Main line
    ctx.strokeStyle = ACCENT + "0.6)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();

    // Tick marks
    ctx.beginPath();
    ctx.moveTo(-half, -tick);
    ctx.lineTo(-half, tick);
    ctx.moveTo(half, -tick);
    ctx.lineTo(half, tick);
    ctx.stroke();

    // Arrow heads
    ctx.fillStyle = ACCENT + "0.5)";
    ctx.beginPath();
    ctx.moveTo(-half + 8, -2.5);
    ctx.lineTo(-half, 0);
    ctx.lineTo(-half + 8, 2.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(half - 8, -2.5);
    ctx.lineTo(half, 0);
    ctx.lineTo(half - 8, 2.5);
    ctx.fill();

    // Text
    const measurement = Math.round(len * 18) + "";
    ctx.fillStyle = ACCENT + "0.45)";
    ctx.font = "9px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(measurement, 0, -6);

    ctx.restore();
  }

  // Draw a pipe segment with flanges
  function drawPipe(ctx, x, y, rot, len, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const half = len / 2;

    // Pipe body
    ctx.strokeStyle = DIM + "0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();

    // Flange marks at ends
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = DIM + "0.25)";
    ctx.beginPath();
    ctx.moveTo(-half, -5);
    ctx.lineTo(-half, 5);
    ctx.moveTo(half, -5);
    ctx.lineTo(half, 5);
    ctx.stroke();

    ctx.restore();
  }

  // Draw an elbow (90-degree arc)
  function drawElbow(ctx, x, y, rot, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const r = size;
    ctx.strokeStyle = DIM + "0.18)";
    ctx.lineWidth = 1.5;

    // Incoming line
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Arc
    ctx.beginPath();
    ctx.arc(0, -r, r, Math.PI / 2, Math.PI);
    ctx.stroke();

    // Outgoing line
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(-r, -r * 2.2);
    ctx.stroke();

    // Small circle at joint
    ctx.strokeStyle = ACCENT + "0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Draw a valve symbol (bowtie)
  function drawValve(ctx, x, y, rot, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const s = size;

    // Lines in/out
    ctx.strokeStyle = DIM + "0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 2, 0);
    ctx.lineTo(-s, 0);
    ctx.moveTo(s, 0);
    ctx.lineTo(s * 2, 0);
    ctx.stroke();

    // Bowtie
    ctx.strokeStyle = ACCENT + "0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.7);
    ctx.lineTo(0, 0);
    ctx.lineTo(-s, s * 0.7);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s, -s * 0.7);
    ctx.lineTo(0, 0);
    ctx.lineTo(s, s * 0.7);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  // Draw a tee junction
  function drawTee(ctx, x, y, rot, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const s = size;
    ctx.strokeStyle = DIM + "0.18)";
    ctx.lineWidth = 1.5;

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(-s * 2, 0);
    ctx.lineTo(s * 2, 0);
    ctx.stroke();

    // Branch
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s * 2);
    ctx.stroke();

    // Junction dot
    ctx.fillStyle = ACCENT + "0.3)";
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw an angle annotation
  function drawAngle(ctx, x, y, rot, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const r = size;
    ctx.strokeStyle = ACCENT + "0.3)";
    ctx.lineWidth = 0.7;

    // Two lines forming the angle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 1.5, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 1.5 * Math.cos(Math.PI / 4), -r * 1.5 * Math.sin(Math.PI / 4));
    ctx.stroke();

    // Arc
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI / 4, 0);
    ctx.stroke();

    // Label
    ctx.fillStyle = ACCENT + "0.35)";
    ctx.font = "8px 'DM Sans', sans-serif";
    ctx.fillText("45", r * 0.45, -4);

    ctx.restore();
  }

  // Draw crosshair / center mark
  function drawCenterMark(ctx, x, y, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = opacity;

    const s = size;
    ctx.strokeStyle = DIM + "0.1)";
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(s, 0);
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s);
    ctx.stroke();

    ctx.strokeStyle = DIM + "0.06)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Draw a small isometric pipe sketch
  function drawIsoSketch(ctx, x, y, rot, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    const s = size;
    ctx.strokeStyle = DIM + "0.14)";
    ctx.lineWidth = 1;

    // Isometric lines (30-degree angles)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 1.5, -s * 0.85);
    ctx.lineTo(s * 3, -s * 0.85);
    ctx.lineTo(s * 4, -s * 1.4);
    ctx.stroke();

    // Elbow dots
    ctx.fillStyle = ACCENT + "0.2)";
    [
      [s * 1.5, -s * 0.85],
      [s * 3, -s * 0.85],
    ].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  const DRAW_FUNCS = [
    // [drawFunc, sizeMultiplier, weight]
    [drawDimension, 1, 4],
    [drawPipe, 1, 3],
    [drawElbow, 1, 2],
    [drawValve, 1, 2],
    [drawTee, 1, 2],
    [drawAngle, 1, 2],
    [drawCenterMark, 1, 1],
    [drawIsoSketch, 1, 2],
  ];

  // Build weighted pool
  const drawPool = [];
  DRAW_FUNCS.forEach(([fn, sm, w]) => {
    for (let i = 0; i < w; i++) drawPool.push([fn, sm]);
  });

  function createParticle() {
    const [drawFn, sizeMul] = drawPool[Math.floor(Math.random() * drawPool.length)];
    const baseSize = 20 + Math.random() * 40;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.002,
      size: baseSize * sizeMul,
      baseOpacity: 0.15 + Math.random() * 0.35,
      opacity: 0,
      draw: drawFn,
    };
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;

      // Wrap around
      if (p.x < -100) p.x = W + 100;
      if (p.x > W + 100) p.x = -100;
      if (p.y < -100) p.y = H + 100;
      if (p.y > H + 100) p.y = -100;

      // Mouse proximity — brighten nearby particles
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - dist / MOUSE_RADIUS);
      const targetOpacity = p.baseOpacity + proximity * 0.5;
      p.opacity += (targetOpacity - p.opacity) * 0.06;

      // Gentle repulsion from mouse
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (1 - dist / MOUSE_RADIUS) * 0.15;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Dampen velocity
      p.vx *= 0.995;
      p.vy *= 0.995;

      p.draw(ctx, p.x, p.y, p.rot, p.size, p.opacity);
    }

    requestAnimationFrame(animate);
  }

  animate();
})();

// ─── Scroll animations ───
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

// Apply fade-up to section elements
document.querySelectorAll(
  ".section-header, .ba-card, .ba-arrow, .feature-card, .step, .comp-card, .cta-box, .hero-badge, .hero h1, .hero-sub, .hero-actions, .hero-stats"
).forEach((el) => {
  el.classList.add("fade-up");
  observer.observe(el);
});

// ─── Smooth anchor scrolling ───
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});
