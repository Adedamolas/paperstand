// GLSL source as a string module (see DECISIONS.md: shader modules).
export const paperFragGlsl = /* glsl */ `
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform sampler2D uGrain;
uniform vec3 uLightDir;    // world, towards the light
uniform vec3 uLightColor;
uniform vec3 uSky;
uniform vec3 uGround;
uniform float uWrap;
uniform float uShow;       // newsprint show-through, front-lit
uniform float uShowBacklit;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  bool front = gl_FrontFacing;
  // The back page is printed for a flip about the horizontal axis, so it reads upright.
  vec2 uvF = vUv;
  vec2 uvB = vec2(vUv.x, 1.0 - vUv.y);

  vec3 n = normalize(vNormalW) * (front ? 1.0 : -1.0);
  vec3 L = normalize(uLightDir);

  vec3 ink = front ? texture2D(uFront, uvF).rgb : texture2D(uBack, uvB).rgb;
  vec3 other = front ? texture2D(uBack, uvB).rgb : texture2D(uFront, uvF).rgb;

  // Thin newsprint: the other side's ink shows through, more when the light is behind.
  float ndl = dot(n, L);
  float backlit = clamp(-ndl, 0.0, 1.0);
  float show = mix(uShow, uShowBacklit, backlit);
  vec3 col = ink * mix(vec3(1.0), other, show);

  // Paper grain (tileable) and yellowing toward the edges.
  float g = texture2D(uGrain, vUv * vec2(3.0, 4.35)).r;
  col *= mix(0.93, 1.04, g);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  col *= mix(vec3(0.9, 0.84, 0.7), vec3(1.0), smoothstep(0.0, 0.05, e));

  // Wrap Lambert plus hemisphere ambient; light passing through counts a little when backlit.
  float diff = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);
  vec3 hemi = mix(uGround, uSky, n.y * 0.5 + 0.5);
  vec3 light = hemi + uLightColor * (diff + backlit * 0.22);

  gl_FragColor = vec4(col * light, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
