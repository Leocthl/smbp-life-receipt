// GLSL for the splat renderer. Two passes share one vertex shader:
//  - solid: near-opaque splats cut to a crisp disc, no blending. Depth testing picks the front-most splat per art
//    pixel, and its colour is a step on its material ramp chosen by the surface normal (docs/LOOK_RULES.md rules 3-5).
//    The alpha channel carries the material code for the pixel pass (outlines, speck cleanup).
//  - soft: translucent splats (haze, glow, shadows, fades) keep the Gaussian falloff and alpha blending.

export const HARD_RADIUS = 1.8;
/** effective opacity at which a splat counts as solid */
export const SOLID_CUT = 0.55;

export const VERTEX = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uData;
uniform int uWidth;
uniform vec2 uViewport;
uniform float uTime;
uniform float uReveal;
uniform float uSize;
uniform float uWind;
uniform float uOpacity;
uniform float uBias;   // draw this mesh this many view units nearer than it is (the hero stays visible behind stalls and trees)
uniform vec3 uLight;
in float aIndex;
out vec2 vPos;
out vec3 vD;
flat out vec4 vInfo;   // ramp, base step, flags, opacity
flat out vec3 vN;
flat out vec3 vInv;
flat out vec3 vLightM;
flat out vec3 vClipLo;
flat out vec3 vClipHi;
flat out vec2 vZ;      // centre depth (ndc), ndc depth per view unit
out float vDz;
vec4 fetch(int i) { return texelFetch(uData, ivec2(i % uWidth, i / uWidth), 0); }
float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  int i = int(aIndex);
  vec4 t0 = fetch(i * 7);      // centre.xyz, sway
  vec4 t1 = fetch(i * 7 + 1);  // covariance xx xy xz yy
  vec4 t2 = fetch(i * 7 + 2);  // covariance yz zz, opacity, flags
  vec4 t3 = fetch(i * 7 + 3);  // normal (or offset from the blob centre), ramp*8+step
  vec4 t4 = fetch(i * 7 + 4);  // 1 / radius^2 of the blob
  vec4 t5 = fetch(i * 7 + 5);  // clip box low corner, relative to the centre
  vec4 t6 = fetch(i * 7 + 6);  // clip box high corner
  // a splat authored solid stays solid until it is faded (tram, props, the goal beacon); then it is drawn soft at that fade.
  // A splat authored translucent is always soft. So nothing pops across the cut while uOpacity animates.
  bool authoredSolid = t2.z >= ${SOLID_CUT.toFixed(2)};
  bool drawSolid = authoredSolid && uOpacity >= 0.995;
  float opa = authoredSolid ? uOpacity : t2.z * uOpacity;
#ifdef SOFT
  bool skip = drawSolid;
#else
  bool skip = !drawSolid;
#endif
  float seed = hash(aIndex + 1.0);
  float p = clamp(uReveal * 1.6 - seed * 0.6, 0.0, 1.0);
  float grow = p * p * (3.0 - 2.0 * p);
  vec3 centre = t0.xyz;
  centre.x += sin(uTime * 1.6 + centre.x * 0.4 + centre.z * 0.3) * t0.w * (0.4 + uWind);
  centre.z += cos(uTime * 1.2 + centre.z * 0.35) * t0.w * 0.5 * (0.4 + uWind);
  centre.y -= (1.0 - grow) * (0.6 + seed * 1.2);
  vec4 view = modelViewMatrix * vec4(centre, 1.0);
  vec4 clip = projectionMatrix * view;
  mat3 cov = mat3(t1.x, t1.y, t1.z, t1.y, t1.w, t2.x, t1.z, t2.x, t2.y) * (uSize * uSize * grow * grow);
  mat3 W = mat3(modelViewMatrix);
  mat3 vcov = W * cov * transpose(W);
  float fx = projectionMatrix[0][0] * uViewport.x * 0.5;
  float fy = projectionMatrix[1][1] * uViewport.y * 0.5;
  bool ortho = projectionMatrix[3][3] > 0.5;
  mat3 J;
  float zv = ortho ? 1.0 : -view.z;
  if (ortho) J = mat3(fx, 0.0, 0.0, 0.0, fy, 0.0, 0.0, 0.0, 0.0);
  else J = mat3(fx / zv, 0.0, 0.0, 0.0, fy / zv, 0.0, fx * view.x / (zv * zv), fy * view.y / (zv * zv), 0.0);
  mat3 c2 = J * vcov * transpose(J);
#ifdef SOFT
  float lowPass = 0.3;
  float k = 2.6;
#else
  float lowPass = 0.55; // a solid splat always covers at least one art pixel
  float k = ${HARD_RADIUS.toFixed(2)};
#endif
  float a = c2[0][0] + lowPass, b = c2[0][1], c = c2[1][1] + lowPass;
  float mid = 0.5 * (a + c);
  float rad = length(vec2(0.5 * (a - c), b));
  float l1 = mid + rad, l2 = max(mid - rad, 0.05);
  vec2 v1 = abs(b) < 1e-6 ? (a >= c ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) : normalize(vec2(b, l1 - a));
  vec2 v2 = vec2(-v1.y, v1.x);
  vec2 offset = position.x * v1 * sqrt(l1) * k + position.y * v2 * sqrt(l2) * k;
  int flags = int(t2.w + 0.5);
  float bias = 0.0;
  if ((flags & 8) != 0) bias = ortho ? 0.3 * abs(projectionMatrix[2][2]) : -0.0008 * clip.w; // detail sits just in front of its surface
  float splatBias = t4.w + mod(aIndex, 64.0) * 0.00008;
  if (ortho) bias += (uBias + splatBias) * abs(projectionMatrix[2][2]);
  else bias -= (splatBias * 0.002) * clip.w;
  gl_Position = clip + vec4(offset / uViewport * 2.0 * clip.w, ortho ? -bias : bias, 0.0);
  vPos = position.xy * k;
  // position of this fragment relative to the splat centre, in the mesh's own space (for the smooth blob normal)
  vec2 vd = offset / vec2(fx, fy) * zv;
  // a flat splat is a plane: each fragment's true depth and position on it follow from the plane's tilt
  vec2 slope = vec2(0.0);
  if ((flags & 35) != 0 && ortho) {
    vec3 nv = W * normalize((flags & 1) != 0 ? t3.xyz * t4.xyz : t3.xyz); // flat: its normal; round: the tangent plane
    if (abs(nv.z) > 0.2) slope = vec2(-nv.x, -nv.y) / nv.z;
  }
  vDz = dot(slope, vd);
  vD = transpose(W) * vec3(vd, vDz);
  vClipLo = t5.xyz; vClipHi = t6.xyz;
  vZ = vec2(gl_Position.z / gl_Position.w, ortho ? projectionMatrix[2][2] : 0.0);
  float code = t3.w;
  float ramp = floor(code / 8.0 + 0.001);
  vInfo = vec4(ramp, code - ramp * 8.0, float(flags), opa);
  vN = t3.xyz;
  vInv = t4.xyz;
  vLightM = transpose(mat3(modelMatrix)) * uLight;
  if (skip || grow < 0.004 || clip.w <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uRamps;
uniform vec3 uTint;
uniform float uSat;
uniform float uGlow;
uniform float uLo;
uniform float uHi;
in vec2 vPos;
in vec3 vD;
flat in vec4 vInfo;
flat in vec3 vN;
flat in vec3 vInv;
flat in vec3 vLightM;
flat in vec3 vClipLo;
flat in vec3 vClipHi;
flat in vec2 vZ;
in float vDz;
out vec4 outColor;
vec3 grade(vec3 col) {
  col *= uTint;
  return mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat) + col * uGlow;
}
void main() {
  float r2 = dot(vPos, vPos);
  int ramp = int(vInfo.x + 0.5), base = int(vInfo.y + 0.5), flags = int(vInfo.z + 0.5);
#ifdef SOFT
  if ((flags & 16) != 0 && (any(lessThan(vD, vClipLo)) || any(greaterThan(vD, vClipHi)))) discard;
  float alpha = min(0.99, (flags & 16) != 0 ? vInfo.w : vInfo.w * exp(-0.5 * r2)); // cut-out panels are flat, not Gaussian
  alpha = floor(alpha * 5.0 + 0.5) / 5.0; // glow is drawn in flat bands, not a smooth gradient
  if (alpha < 0.1) discard;
  vec3 col = grade(texelFetch(uRamps, ivec2(base, ramp), 0).rgb);
  gl_FragDepth = (vZ.x + vDz * vZ.y) * 0.5 + 0.5; // same plane depth as the solid pass, or a light pool is cut by the floor it lies on
  outColor = vec4(col * alpha, alpha);
#else
  if (r2 > ${(HARD_RADIUS * HARD_RADIUS).toFixed(2)}) discard;
  if ((flags & 16) != 0 && (any(lessThan(vD, vClipLo)) || any(greaterThan(vD, vClipHi)))) discard; // flat splats are cut to their own panel
  if ((flags & 1) != 0) { vec3 e = vD + vN; if (dot(e * e, vInv) > 1.0) discard; } // blobs are cut to their ellipsoid
  gl_FragDepth = (vZ.x + vDz * vZ.y) * 0.5 + 0.5;
  int stp = base;
  float l = 0.5;
  if ((flags & 1) != 0) l = dot(normalize((vD + vN) * vInv), vLightM);
  else if ((flags & 2) != 0) l = dot(normalize(vN), vLightM);
  if ((flags & 3) != 0) stp = base + (l > uHi ? 1 : (l < uLo ? -1 : 0));
  vec3 col = grade(texelFetch(uRamps, ivec2(clamp(stp, 0, 4), ramp), 0).rgb);
  float code = ((flags & 8) != 0 ? 201.0 : ((flags & 4) != 0 ? 101.0 : 1.0)) + float(ramp);
  outColor = vec4(col, code / 255.0);
#endif
}`;
