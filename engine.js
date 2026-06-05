// Pure game logic — no canvas, no DOM. Imported by both the browser game
// (game.js) and the test suite (game.test.js) so the rules are tested in
// isolation from the rendering.

export const GRAVITY = 0.45;        // downward pull added to velocity each tick
export const FLAP_VELOCITY = -7.5;  // upward kick when the frog flaps
export const FROG_RADIUS = 26;      // collision radius

// A frog is a point with vertical velocity. x is fixed; the world scrolls past.
export function createFrog(y) {
  return { x: 120, y, vy: 0, r: FROG_RADIUS };
}

// Gravity per tick, scaled by dt (1.0 = one 60fps frame) so the game runs at
// the same speed on every device regardless of its frame rate.
export function applyGravity(frog, dt = 1) {
  frog.vy += GRAVITY * dt;
  frog.y += frog.vy * dt;
  return frog;
}

// A flap discards downward momentum and kicks the frog upward.
export function flap(frog, flapVelocity = FLAP_VELOCITY) {
  frog.vy = flapVelocity;
  return frog;
}

// An obstacle is a pair of tongues with a gap centred on gapY.
export function createObstacle(x, gapY, gapHeight = 180, width = 70) {
  return { x, gapY, gapHeight, width, passed: false };
}

export function moveObstacle(obs, speed) {
  obs.x -= speed;
  return obs;
}

// True if the frog hits the ceiling, the floor, or either tongue.
export function checkCollision(frog, obstacles, width, height) {
  if (frog.y - frog.r <= 0) return true;        // ate by the night above
  if (frog.y + frog.r >= height) return true;   // hit the ground

  for (const obs of obstacles) {
    const overlapX =
      frog.x + frog.r > obs.x && frog.x - frog.r < obs.x + obs.width;
    if (!overlapX) continue;

    const topTongueEnds = obs.gapY - obs.gapHeight / 2;
    const bottomTongueStarts = obs.gapY + obs.gapHeight / 2;
    if (frog.y - frog.r < topTongueEnds) return true;
    if (frog.y + frog.r > bottomTongueStarts) return true;
  }
  return false;
}

// Add 1 for each obstacle the frog has fully cleared, exactly once.
export function updateScore(frog, obstacles, score) {
  let newScore = score;
  for (const obs of obstacles) {
    if (!obs.passed && obs.x + obs.width < frog.x - frog.r) {
      obs.passed = true;
      newScore += 1;
    }
  }
  return newScore;
}
