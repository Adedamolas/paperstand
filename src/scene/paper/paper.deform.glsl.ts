// GLSL source as a string module (see DECISIONS.md: shader modules).
export const paperDeformGlsl = /* glsl */ `
// Paper deformation (spec 6.2). Shared by the colour shader and any depth shader so they agree.
//
// Input is a point on the flat sheet in local XY (centred, width uW, height uH, facing +Z).
// The sheet is treated as a vertical strip that bends around the X axis: we integrate a bend
// angle theta(t) along t = y - gripY, which gives droop, the fold crease, and the TURNOVER curl
// as one continuous curve with no stretching. Sag, curl, flap, air drag and breeze then push
// along the strip normal. Finally TURNOVER rotates the whole sheet about its centre line.

uniform float uW;
uniform float uH;
uniform float uGripY;      // absolute local y of the grip line
uniform float uSag;
uniform float uDroop;
uniform float uDroopBottom;
uniform float uDroopEdgeRelief;
uniform float uCurl;
uniform float uCurlBottom;
uniform float uFlapA;
uniform float uFlapPhase;
uniform float uFlapK;
uniform float uAir;
uniform vec2 uVel;         // smoothed grip velocity, local units per second
uniform float uBreeze;
uniform float uBreezeScale;
uniform float uTime;
uniform float uFold;       // 0 flat .. 1 folded
uniform float uCreaseR;
uniform float uFoldClosure;
uniform float uTurn;       // 0 front .. 1 back .. 2 front again
uniform float uTurnCurl;
uniform vec3 uPin0;        // stone pins on the stand: (x, y, radius); radius 0 = off
uniform vec3 uPin1;

const float PAPER_PI = 3.14159265;

// Per-call turn state, set at the top of paperDeform() before the helpers run.
float pGy;        // grip line, eased to the centre while edge-on so both halves of the turn agree
float pHeld;      // 1 when held face-on, 0 when edge-on mid-turn
float pTurnBend;  // signed C-curl during the turn

float paperHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float paperNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(paperHash(i), paperHash(i + vec2(1.0, 0.0)), u.x),
    mix(paperHash(i + vec2(0.0, 1.0)), paperHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Bend angle along the strip. Positive theta tilts the strip away from the viewer as t grows.
float paperTheta(float t, float wx) {
  float h = uH * 0.5;
  float d = pow(smoothstep(0.0, h, abs(t)), 1.6) * uDroop * pHeld * wx;
  float theta = t >= 0.0 ? d : -d * uDroopBottom;

  // TURNOVER: the sheet curves into a C mid-turn, so the free halves trail the rotation.
  theta -= pTurnBend * smoothstep(0.0, h, abs(t));

  // Fold crease at the horizontal centre line (y = 0): the lower half turns back by alpha
  // over the arc length of a cylinder of radius uCreaseR, then runs back up behind.
  float tf = -pGy;
  float alpha = uFold * uFoldClosure * PAPER_PI;
  float c = max(alpha * uCreaseR, 1e-5);
  theta -= alpha * clamp((tf - t) / c, 0.0, 1.0);
  return theta;
}

// Midpoint integration of (cos theta, -sin theta) from t0 to t1. Returns (dY, dZ).
vec2 paperIntegrate(float t0, float t1, float wx, int n) {
  vec2 acc = vec2(0.0);
  float dt = (t1 - t0) / float(n);
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float th = paperTheta(t0 + (float(i) + 0.5) * dt, wx);
    acc += vec2(cos(th), -sin(th)) * dt;
  }
  return acc;
}

vec2 paperStrip(float s, float wx) {
  if (s >= 0.0) return paperIntegrate(0.0, s, wx, 8);
  float tf = -pGy;
  float alpha = uFold * uFoldClosure * PAPER_PI;
  float c = alpha * uCreaseR;
  // [0, tf] droop only; [tf, tf - c] crease arc; [tf - c, s] beyond the crease.
  vec2 acc = paperIntegrate(0.0, max(s, tf), wx, 6);
  if (s < tf) acc += paperIntegrate(tf, max(s, tf - c), wx, 3);
  if (s < tf - c) acc += paperIntegrate(tf - c, s, wx, 6);
  return acc;
}

vec3 paperDeform(vec2 p) {
  // TURNOVER (spec 6.2 layer 7). Each half-turn runs in two halves about the sheet's centre:
  // the face-on held shape relaxes to flat as the sheet goes edge-on, then the sheet continues
  // in the mirrored frame (material y reversed) and the held shape rebuilds facing the viewer.
  // So the back page ends in exactly the pose the front page had.
  float turnN = floor(uTurn);
  float f = uTurn - turnN;
  bool secondHalf = f >= 0.5;
  bool flipped = (mod(turnN, 2.0) > 0.5) != secondHalf;
  float c = cos(PAPER_PI * f);
  pHeld = c * c;
  pGy = uGripY * pHeld;
  pTurnBend = uTurnCurl * sin(PAPER_PI * f) * (secondHalf ? -1.0 : 1.0);
  float alpha = secondHalf ? -PAPER_PI * (f - 1.0) : -PAPER_PI * f;
  if (flipped) p.y = -p.y;

  float x = p.x;
  float t = p.y - pGy;
  float xn = 2.0 * x / uW;              // -1 .. 1 across the width
  float x2 = xn * xn;
  float wx = 1.0 - uDroopEdgeRelief * x2;

  // Grip sag: held at the side edges, the sheet wraps a cylinder around the vertical axis, so
  // the middle bows away and the vertical edges stay straight. uSag is the bow depth at the
  // centre; the arc is inextensible, so the hands draw slightly closer together as it deepens.
  float kappa = max(8.0 * uSag * pHeld / (uW * uW), 1e-4);
  float halfW = uW * 0.5;
  vec3 arc = vec3(sin(kappa * x) / kappa, 0.0, -(cos(kappa * x) - cos(kappa * halfW)) / kappa);
  vec3 nArc = vec3(-sin(kappa * x), 0.0, cos(kappa * x));

  // Vertical strip bend (droop, fold crease, turn curl), riding on the arc.
  vec2 st = paperStrip(t, wx);
  float theta = paperTheta(t, wx);
  vec3 pos = arc + vec3(0.0, pGy + st.x, 0.0) + nArc * st.y;
  vec3 n = vec3(0.0, sin(theta), 0.0) + nArc * cos(theta);

  // Free-region weight: 0 on the grip line, 1 at the far edges.
  float h = uH * 0.5;
  float d = abs(t) + 0.35 * (uW * 0.5 - abs(x));
  float wf = smoothstep(0.0, h, d);

  float disp = 0.0;
  float held = pHeld;

  // Corner curl: free corners flop toward the viewer, the top ones (above the hands) most.
  float corner = smoothstep(0.35, 1.0, abs(xn)) * smoothstep(0.3 * uH, 0.62 * uH, abs(t));
  disp += uCurl * held * corner * corner * (t > 0.0 ? 1.0 : uCurlBottom);

  // Flap: a travelling wave on the free regions.
  disp += uFlapA * held * wf * sin(uFlapK * d - uFlapPhase);

  // Air drag: edges leading the motion are pushed back, trailing edges lift a little.
  float lead = dot(uVel, vec2(x, t)) / h;
  disp -= uAir * held * wf * (lead > 0.0 ? lead : 0.3 * lead);

  // Breeze: low-amplitude lift on free edges, held down near stones.
  vec2 uv = vec2(p.x / uW + 0.5, p.y / uH + 0.5);
  float edge = clamp(max(abs(xn), abs(2.0 * p.y / uH)) - 0.35, 0.0, 1.0) / 0.65;
  float pin = 1.0;
  if (uPin0.z > 0.0) pin *= smoothstep(uPin0.z, uPin0.z * 3.0, distance(p, uPin0.xy));
  if (uPin1.z > 0.0) pin *= smoothstep(uPin1.z, uPin1.z * 3.0, distance(p, uPin1.xy));
  float nz = paperNoise(uv * uBreezeScale + vec2(uTime * 0.6, uTime * 0.35) * 1.0);
  nz = 0.6 * nz + 0.4 * paperNoise(uv * uBreezeScale * 2.3 - uTime * 0.8);
  disp += uBreeze * edge * edge * pin * nz;

  pos += n * disp;

  // Rotate about the centre line. Negative alpha brings the bottom edge toward the viewer.
  float cp = cos(alpha);
  float sp = sin(alpha);
  vec2 yz = pos.yz;
  pos.y = yz.x * cp - yz.y * sp;
  pos.z = yz.x * sp + yz.y * cp;

  return pos;
}
`;
