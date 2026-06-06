// Flappy Frog — rendering, input, and the game loop.
// All the rules live in engine.js; this file only draws them and listens
// for flaps.

import {
  createFrog, applyGravity, flap,
  createObstacle, moveObstacle, checkCollision, updateScore,
} from "./engine.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// Scale the canvas to fit the screen (iPhone included) while keeping the
// 480x640 internal resolution, so every game coordinate stays the same.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.round(W * scale) + "px";
  canvas.style.height = Math.round(H * scale) + "px";
}
fitCanvas();
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", fitCanvas);

const SPEED_BASE = 2.6;     // how fast the world scrolls at score 0 (higher = faster)
const SPAWN_GAP_X = 270;    // horizontal distance between screw pairs (more = easier)
const GAP_HEIGHT = 225;     // vertical opening the frog flies through (more = easier)

// --- starfield (fixed for the session) -------------------------------------
const stars = [];
for (let i = 0; i < 70; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.3 + 0.2,
    a: Math.random() * 0.5 + 0.2,
  });
}

// --- game state ------------------------------------------------------------
let state, frog, obstacles, score, speed;
let moonFace = 0;          // 0 = grin, 1 = tongue-out; toggles every 10s
let happyTimer = 0;        // >0 while the frog does a "woohoo" after scoring

function reset() {
  state = "start";          // "start" | "playing" | "dead"
  frog = createFrog(H / 2);
  obstacles = [];
  score = 0;
  speed = SPEED_BASE;
  happyTimer = 0;
}
reset();

function spawnIfNeeded() {
  const last = obstacles[obstacles.length - 1];
  if (!last || last.x < W - SPAWN_GAP_X) {
    const margin = 130;
    const gapY = margin + Math.random() * (H - margin * 2);
    obstacles.push(createObstacle(W, gapY, GAP_HEIGHT, 70));
  }
}

function update(dt) {
  if (state !== "playing") return;

  if (happyTimer > 0) happyTimer -= dt;

  applyGravity(frog, dt);
  spawnIfNeeded();
  for (const o of obstacles) moveObstacle(o, speed * dt);
  while (obstacles.length && obstacles[0].x + obstacles[0].width < -10) {
    obstacles.shift();
  }

  const prevScore = score;
  score = updateScore(frog, obstacles, score);
  if (score > prevScore) {
    happyTimer = 36;          // ~0.6s of "woohoo" face at 60fps
    playScoreSound();         // ...and the woohoo sound
  }
  speed = SPEED_BASE + score * 0.04;   // the night gets faster

  if (checkCollision(frog, obstacles, W, H)) {
    state = "dead";
  }
}

// --- drawing ---------------------------------------------------------------
function drawBackground() {
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(20,24,40,0.6)");
  g.addColorStop(1, "rgba(5,6,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#cdd6f4";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMoon() {
  const mx = W - 88, my = 98, R = 42;
  ctx.save();

  // flat pale moon (no glow — keeps the frame rate up)
  ctx.fillStyle = "#e8ead0";
  ctx.beginPath();
  ctx.arc(mx, my, R, 0, Math.PI * 2);
  ctx.fill();

  // face drawn in local coords, scaled with the moon
  ctx.translate(mx, my);
  ctx.scale(R / 34, R / 34);
  if (moonFace === 0) drawMoonGrin();
  else drawMoonTongue();

  ctx.restore();
}

// Bold raised eyebrows, shared by both faces.
function drawMoonBrows() {
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-19, -16);
  ctx.quadraticCurveTo(-12, -23, -4, -18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -18);
  ctx.quadraticCurveTo(12, -24, 19, -15);
  ctx.stroke();
  ctx.lineCap = "butt";
}

// One big googly eye; (px,py) offsets the pupil (py<0 looks up).
function drawMoonEye(ex, ey, px, py) {
  const INK = "#1a1a1a";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(ex, ey, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();                         // light-blue lower pool
  ctx.beginPath();
  ctx.arc(ex, ey, 8.2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#c2e6f2";
  ctx.beginPath();
  ctx.ellipse(ex, ey + 6, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = INK;                // pupil
  ctx.beginPath();
  ctx.arc(ex + px, ey + py, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";          // glint
  ctx.beginPath();
  ctx.arc(ex + px + 1.4, ey + py - 1.4, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

// Face 0 — cross-eyed manic grin with crooked teeth.
function drawMoonGrin() {
  const INK = "#1a1a1a";
  drawMoonBrows();
  drawMoonEye(-9, -6, 2.6, 1.2);
  drawMoonEye(9, -7, -2.2, 2.2);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.quadraticCurveTo(0, 24, 16, 6);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-16, 5);
  ctx.quadraticCurveTo(0, 24, 16, 5);
  ctx.quadraticCurveTo(0, 13, -16, 5);
  ctx.closePath();
  ctx.clip();
  const teeth = [
    { x: -13, w: 4.5, h: 7, t: -0.2 },
    { x: -8.5, w: 5, h: 9, t: 0.05 },
    { x: -3.5, w: 4, h: 6.5, t: -0.16 },
    { x: 1.5, w: 5.5, h: 8.5, t: 0.12 },
    { x: 7, w: 4, h: 6, t: -0.1 },
    { x: 11.5, w: 4.5, h: 7.5, t: 0.26 },
  ];
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  for (const t of teeth) {
    ctx.save();
    ctx.translate(t.x, 5);
    ctx.rotate(t.t);
    ctx.fillRect(-t.w / 2, 0, t.w, t.h);
    ctx.strokeRect(-t.w / 2, 0, t.w, t.h);
    ctx.restore();
  }
  ctx.restore();
  ctx.lineCap = "butt";
}

// Face 1 — eyes up, open mouth, tongue lolling out.
function drawMoonTongue() {
  const INK = "#1a1a1a";
  drawMoonBrows();
  drawMoonEye(-9, -5, 0.6, -2.6);
  drawMoonEye(9, -6, -0.6, -2.6);

  // open mouth (filled black)
  const mouth = () => {
    ctx.beginPath();
    ctx.moveTo(-15, 4);
    ctx.quadraticCurveTo(0, 1, 15, 4);
    ctx.quadraticCurveTo(16, 20, 0, 25);
    ctx.quadraticCurveTo(-16, 20, -15, 4);
    ctx.closePath();
  };
  ctx.fillStyle = INK;
  mouth();
  ctx.fill();

  // top teeth, clipped inside the mouth
  ctx.save();
  mouth();
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  for (const tx of [-9.5, -3.5, 2.5, 8.5]) {
    ctx.fillRect(tx - 2.3, 4, 4.6, 5.2);
  }
  ctx.restore();

  // tongue lolling out the bottom
  ctx.fillStyle = "#f472a4";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, 15);
  ctx.quadraticCurveTo(-9, 31, 0, 32);
  ctx.quadraticCurveTo(9, 31, 6, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#c84f80";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.quadraticCurveTo(2.5, 25, 0, 29);
  ctx.stroke();
}

// A steel screw: threaded shaft receding to the edge, wide slotted head
// facing the gap. yEdge is the off-screen end, yHead the gap end.
function drawScrew(cx, w, yEdge, yHead, top) {
  const dir = top ? 1 : -1;
  const shaftW = w * 0.5;       // shaft is half the head's width
  const headW = w;              // head is the wide part, near the gap
  const headDepth = 26;
  const yHeadBase = yHead - dir * headDepth;   // where head meets shaft

  // --- threaded shaft ---
  const shaftTop = Math.min(yEdge, yHeadBase);
  const shaftH = Math.abs(yHeadBase - yEdge);
  let g = ctx.createLinearGradient(cx - shaftW / 2, 0, cx + shaftW / 2, 0);
  g.addColorStop(0, "#565d66");
  g.addColorStop(0.5, "#c2c9d1");
  g.addColorStop(1, "#565d66");
  ctx.fillStyle = g;
  ctx.fillRect(cx - shaftW / 2, shaftTop, shaftW, shaftH);
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#34393f";
  ctx.strokeRect(cx - shaftW / 2, shaftTop, shaftW, shaftH);

  // thread chevrons pointing out toward the edge
  ctx.strokeStyle = "rgba(40,44,50,0.75)";
  ctx.lineWidth = 2;
  for (
    let y = yHeadBase - dir * 8;
    dir > 0 ? y > shaftTop + 4 : y < shaftTop + shaftH - 4;
    y -= dir * 11
  ) {
    ctx.beginPath();
    ctx.moveTo(cx - shaftW / 2, y);
    ctx.lineTo(cx, y - dir * 5);
    ctx.lineTo(cx + shaftW / 2, y);
    ctx.stroke();
  }

  // --- head (the wide part, facing the gap) ---
  const headTop = Math.min(yHead, yHeadBase);
  g = ctx.createLinearGradient(cx - headW / 2, 0, cx + headW / 2, 0);
  g.addColorStop(0, "#646b74");
  g.addColorStop(0.5, "#d7dde3");
  g.addColorStop(1, "#646b74");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - headW / 2, headTop, headW, headDepth, 7);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#34393f";
  ctx.stroke();

  // flathead drive slot across the head
  const slotW = headW * 0.56;
  const slotThick = 6;
  const slotY = yHead - dir * (headDepth / 2);
  ctx.fillStyle = "#23272c";
  ctx.fillRect(cx - slotW / 2, slotY - slotThick / 2, slotW, slotThick);
}

function drawObstacle(o) {
  const cx = o.x + o.width / 2;
  const topEnds = o.gapY - o.gapHeight / 2;
  const bottomStarts = o.gapY + o.gapHeight / 2;
  drawScrew(cx, o.width, -20, topEnds, true);
  drawScrew(cx, o.width, H + 20, bottomStarts, false);
}

// The frog face — drawn from primitives, dead-eyed and resigned.
function drawFrog(f, happy) {
  const { x, y, vy, r } = f;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.max(-0.35, Math.min(0.7, vy * 0.05)));
  ctx.scale(r / 26, r / 26);
  ctx.lineJoin = "round";

  const OUT = "#15170f";
  const GREEN = "#7da64b";
  const GREEN_D = "#6b8e3d";
  const BELLY = "#a9c46b";

  // head
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUT;
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.ellipse(0, 6, 29, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // chin / belly highlight
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(0, 18, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // jowl crease
  ctx.strokeStyle = "rgba(21,23,15,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.quadraticCurveTo(0, 28, 14, 22);
  ctx.stroke();

  // eye bulges
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUT;
  for (const ex of [-15, 15]) {
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(ex, -15, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // eyes
  if (happy) {
    // scrunched-up happy eyes (^^)
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const ex of [-15, 15]) {
      ctx.beginPath();
      ctx.moveTo(ex - 9, -10);
      ctx.quadraticCurveTo(ex, -22, ex + 9, -10);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  } else {
    // narrow, almond-shaped, upturned at the outer corner, half-lidded
    for (const [ex, outer] of [[-15, -1], [15, 1]]) {
      ctx.save();
      ctx.translate(ex, -12);
      ctx.rotate(outer * -0.18);          // lift the outer corner
      const aw = 12.5, ah = 7.5;          // wide + short = almond

      ctx.fillStyle = "#d98a2b";          // amber almond
      ctx.beginPath();
      ctx.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();                         // interior, clipped to the almond
      ctx.beginPath();
      ctx.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#b96e1f";          // amber depth
      ctx.beginPath();
      ctx.arc(0, 1.5, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#161616";          // pupil
      ctx.beginPath();
      ctx.arc(0, 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GREEN_D;            // upper half-lid hoods the top
      ctx.fillRect(-aw - 1, -ah - 1, (aw + 1) * 2, ah + 0.5);
      ctx.restore();

      ctx.lineWidth = 2.4;                // almond outline
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.ellipse(0, 0, aw, ah, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.6;                // upper-lid crease
      ctx.beginPath();
      ctx.moveTo(-aw + 1, -1);
      ctx.quadraticCurveTo(0, -ah - 1.5, aw - 1, -1);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.85)";  // faint glint
      ctx.beginPath();
      ctx.ellipse(-3.5, 2.5, 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // nostrils
  ctx.fillStyle = "#2a2f1d";
  ctx.beginPath();
  ctx.arc(-5, 0, 1.6, 0, Math.PI * 2);
  ctx.arc(5, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();

  if (happy) {
    // wide-open "woohoo!" mouth
    ctx.fillStyle = "#3a1420";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-15, 11);
    ctx.quadraticCurveTo(0, 6, 15, 11);     // open upper lip
    ctx.quadraticCurveTo(12, 26, 0, 27);    // round down...
    ctx.quadraticCurveTo(-12, 26, -15, 11); // ...and back up
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d76b94";              // little tongue
    ctx.beginPath();
    ctx.ellipse(0, 22, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // grim mouth, corners drooping
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-20, 12);
    ctx.quadraticCurveTo(0, 16, 20, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, 12); ctx.lineTo(-22, 15);
    ctx.moveTo(20, 12); ctx.lineTo(22, 15);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  ctx.restore();
}

function drawUI() {
  ctx.textAlign = "center";

  if (state === "start") {
    ctx.fillStyle = "#e6e6e6";
    ctx.font = "bold 40px Courier New";
    ctx.fillText("FLAPPY FROG", W / 2, H / 2 - 70);
    ctx.fillStyle = "#8a93a6";
    ctx.font = "15px Courier New";
    ctx.fillText("how long can you survive the night?", W / 2, H / 2 - 42);
    ctx.fillStyle = "#cdd6f4";
    ctx.font = "16px Courier New";
    ctx.fillText("SPACE or click to flap", W / 2, H / 2 + 130);
  } else if (state === "playing") {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Courier New";
    ctx.fillText(String(score), W / 2, 72);
  } else if (state === "dead") {
    ctx.fillStyle = "rgba(3,4,8,0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c0392b";
    ctx.font = "bold 30px Courier New";
    ctx.fillText("frogs eating", W / 2, H / 2 - 54);
    ctx.fillText("each other", W / 2, H / 2 - 20);
    ctx.fillStyle = "#e6e6e6";
    ctx.font = "20px Courier New";
    ctx.fillText("you lasted " + score, W / 2, H / 2 + 16);
    ctx.fillStyle = "#cdd6f4";
    ctx.font = "16px Courier New";
    ctx.fillText("SPACE to send in the next one", W / 2, H / 2 + 70);
  }
}

// --- loop ------------------------------------------------------------------
let lastT = null;
function frame(now) {
  if (now === undefined) { requestAnimationFrame(frame); return; }
  if (lastT === null) lastT = now;
  let dt = (now - lastT) / (1000 / 60);   // 1.0 == one 60fps frame
  lastT = now;
  if (!(dt > 0)) dt = 1;
  dt = Math.min(dt, 3);                    // clamp big gaps (e.g. backgrounded tab)
  update(dt);
  drawBackground();
  drawMoon();
  for (const o of obstacles) drawObstacle(o);
  drawFrog(frog, happyTimer > 0);
  drawUI();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- input -----------------------------------------------------------------
function press() {
  if (state === "start") {
    state = "playing";
    flap(frog);
    playFlapSound();
  } else if (state === "playing") {
    flap(frog);
    playFlapSound();
  } else if (state === "dead") {
    reset();
  }
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    press();
  }
});
canvas.addEventListener("mousedown", press);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  press();
}, { passive: false });

// --- sound: "DJ fucked" on every flap -------------------------------------
const SOUND_URL = "dj-fucked.m4a";
let audioCtx = null;
let flapBuffer = null;
let lastSource = null;

(async function loadSound() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(SOUND_URL);
    const data = await res.arrayBuffer();
    flapBuffer = await audioCtx.decodeAudioData(data);
    console.log("flap sound ready:", flapBuffer.duration.toFixed(2) + "s");
  } catch (e) {
    console.warn("flap sound failed to load:", e);
  }
})();

function playFlapSound() {
  if (!audioCtx || !flapBuffer) return;
  if (audioCtx.state === "suspended") audioCtx.resume();   // unlock on first gesture
  if (lastSource) {
    try { lastSource.stop(); } catch (_) {}                // restart: cut the previous voice
  }
  const src = audioCtx.createBufferSource();
  src.buffer = flapBuffer;
  src.connect(audioCtx.destination);
  src.start(0);
  lastSource = src;
}

// --- moon: a cheap squeaky giggle, synthesized (no file needed) -----------
function playLaugh() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t0 = audioCtx.currentTime;
  const beats = [0, 0.075, 0.15, 0.225, 0.3];     // hee-hee-hee-hee-hee
  const pitch = [820, 1000, 920, 1100, 980];      // wobbling, squirrel-ish
  beats.forEach((dt, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(pitch[i], t0 + dt);
    o.frequency.exponentialRampToValueAtTime(pitch[i] * 1.25, t0 + dt + 0.05);
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + dt + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.07);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t0 + dt);
    o.stop(t0 + dt + 0.09);
  });
}

// Swap the moon's face every 10s, giggling on each switch.
setInterval(() => {
  moonFace ^= 1;
  playLaugh();
}, 10000);

// A cheerful upward "woohoo" when the frog clears an obstacle.
function playScoreSound() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(420, t0);
  o.frequency.exponentialRampToValueAtTime(880, t0 + 0.14);   // woo...
  o.frequency.exponentialRampToValueAtTime(770, t0 + 0.22);   // ...hoo
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.27);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + 0.3);
}

// iOS unlock: Safari keeps Web Audio muted until the first touch both resumes
// the context AND plays a (silent) buffer inside that gesture.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked || !audioCtx) return;
  audioCtx.resume();
  const b = audioCtx.createBuffer(1, 1, 22050);
  const s = audioCtx.createBufferSource();
  s.buffer = b;
  s.connect(audioCtx.destination);
  s.start(0);
  audioUnlocked = true;
}
["touchstart", "touchend", "mousedown", "keydown"].forEach((ev) =>
  window.addEventListener(ev, unlockAudio, { passive: true })
);
