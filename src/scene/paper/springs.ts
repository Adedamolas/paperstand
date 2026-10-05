// Semi-implicit Euler springs (spec 6.3): v += (-k (x - target) - c v) dt; x += v dt.

export const MAX_DT = 1 / 30;

export class Spring {
  x: number;
  v = 0;
  constructor(x = 0) {
    this.x = x;
  }
  step(target: number, k: number, c: number, dt: number) {
    const h = Math.min(dt, MAX_DT);
    this.v += (-k * (this.x - target) - c * this.v) * h;
    this.x += this.v * h;
    return this.x;
  }
  impulse(dv: number) {
    this.v += dv;
  }
  snap(x: number) {
    this.x = x;
    this.v = 0;
  }
}

export class Spring2 {
  x: Spring;
  y: Spring;
  constructor(x = 0, y = 0) {
    this.x = new Spring(x);
    this.y = new Spring(y);
  }
  step(tx: number, ty: number, k: number, c: number, dt: number) {
    this.x.step(tx, k, c, dt);
    this.y.step(ty, k, c, dt);
  }
  get speed() {
    return Math.hypot(this.x.v, this.y.v);
  }
}

/** Fixed-duration tween state for transitions with a single owner animation (spec 2.1). */
export class Tween {
  from = 0;
  to = 0;
  t = 1;
  duration = 1;
  get value() {
    return this.from + (this.to - this.from) * easeInOut(this.t);
  }
  get running() {
    return this.t < 1;
  }
  start(from: number, to: number, ms: number) {
    this.from = from;
    this.to = to;
    this.t = 0;
    this.duration = Math.max(ms, 1) / 1000;
  }
  step(dt: number) {
    if (this.t < 1) this.t = Math.min(1, this.t + dt / this.duration);
    return this.value;
  }
}

export function easeInOut(t: number) {
  // cubic-bezier(0.77, 0, 0.175, 1)-like, but analytic
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
