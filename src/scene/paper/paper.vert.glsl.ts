// GLSL source as a string module (see DECISIONS.md: shader modules).
export const paperVertGlsl = /* glsl */ `
// The deformation chunk (paper.deform.glsl.ts) is prepended in material.ts.

uniform float uNormalEps;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec2 p = position.xy;
  vec3 pos = paperDeform(p);
  // Normals by finite differences on the deformed surface (spec 6.2).
  vec3 px = paperDeform(p + vec2(uNormalEps, 0.0));
  vec3 py = paperDeform(p + vec2(0.0, uNormalEps));
  vec3 n = normalize(cross(px - pos, py - pos));

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
