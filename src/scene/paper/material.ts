import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3, type Texture } from 'three';
import { paperDeformGlsl } from './paper.deform.glsl';
import { paperFragGlsl } from './paper.frag.glsl';
import { paperVertGlsl } from './paper.vert.glsl';

export const PAPER_W = 1;
export const PAPER_H = 1.45;

/** Vertex shader with the shared deformation chunk inlined. Reuse for a depth material. */
export const paperVertexShader = `${paperDeformGlsl}\n${paperVertGlsl}`;

export type PaperUniforms = ReturnType<typeof createPaperUniforms>;

export function createPaperUniforms(front: Texture, back: Texture, grain: Texture) {
  return {
    uW: { value: PAPER_W },
    uH: { value: PAPER_H },
    uGripY: { value: 0.1 * PAPER_H },
    uSag: { value: 0 },
    uDroop: { value: 0 },
    uDroopBottom: { value: 0 },
    uDroopEdgeRelief: { value: 0 },
    uCurl: { value: 0 },
    uCurlBottom: { value: 0.3 },
    uFlapA: { value: 0 },
    uFlapPhase: { value: 0 },
    uFlapK: { value: 9 },
    uAir: { value: 0 },
    uVel: { value: new Vector2() },
    uBreeze: { value: 0 },
    uBreezeScale: { value: 2 },
    uTime: { value: 0 },
    uFold: { value: 0 },
    uCreaseR: { value: 0.004 * PAPER_H },
    uFoldClosure: { value: 0.97 },
    uTurn: { value: 0 },
    uTurnCurl: { value: 0 },
    uPin0: { value: new Vector3() },
    uPin1: { value: new Vector3() },
    uNormalEps: { value: 0.002 },

    uFront: { value: front },
    uBack: { value: back },
    uGrain: { value: grain },
    uLightDir: { value: new Vector3(-0.55, 0.75, 0.55).normalize() },
    uLightColor: { value: new Color('#fff1dc').multiplyScalar(0.85) },
    uSky: { value: new Color('#e9e4da').multiplyScalar(0.5) },
    uGround: { value: new Color('#6a5640').multiplyScalar(0.35) },
    uWrap: { value: 0.28 },
    uShow: { value: 0.06 },
    uShowBacklit: { value: 0.16 },
    uOpacity: { value: 1 },
  };
}

export function createPaperMaterial(uniforms: PaperUniforms) {
  return new ShaderMaterial({
    uniforms,
    vertexShader: paperVertexShader,
    fragmentShader: paperFragGlsl,
    side: DoubleSide,
  });
}
