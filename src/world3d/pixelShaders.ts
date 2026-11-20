// Pixel-art resolve passes (docs/LOOK_RULES.md rules 6-9). The scene is drawn at art-pixel size with no multisampling, so
// every art pixel holds the colour of ONE front-most splat, and its alpha channel holds that splat's material code:
//   0 sky   1..100 solid material   101..200 effect (rain, sparks: never outlined)   201..250 face detail (protected)
// Pass 1 removes isolated pixels. Pass 2 draws 1-pixel ink outlines on the far side of every depth jump, then the sky.

export const VERT = 'out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const COMMON = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D map;
uniform vec2 lowSize;
in vec2 vUv;
out vec4 outColor;
ivec2 clampP(ivec2 p) { return clamp(p, ivec2(0), ivec2(lowSize) - 1); }
vec4 at(ivec2 p) { return texelFetch(map, clampP(p), 0); }
int codeOf(vec4 c) { return int(c.a * 255.0 + 0.5); }
bool solidCode(int k) { return k >= 1 && k <= 100; }
bool inked(int k) { return (k >= 1 && k <= 100) || (k >= 201 && k <= 250); }
bool same(vec4 a, vec4 b) { return codeOf(a) == codeOf(b) && all(lessThan(abs(a.rgb - b.rgb), vec3(0.004))); }
const ivec2 N8[8] = ivec2[8](ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1), ivec2(-1, -1), ivec2(1, -1), ivec2(-1, 1), ivec2(1, 1));
`;

/** Pass 1: a solid pixel with no neighbour of its own material is a speck. It takes the majority neighbour, or the sky. */
export const CLEAN = COMMON + /* glsl */ `
uniform vec3 uSky;
void main() {
  ivec2 p = ivec2(floor(vUv * lowSize));
  vec4 c = at(p);
  if (!solidCode(codeOf(c))) { outColor = c; return; }
  vec4 nb[8];
  int sameMaterial = 0;
  for (int i = 0; i < 8; i++) { nb[i] = at(p + N8[i]); if (codeOf(nb[i]) == codeOf(c)) sameMaterial++; }
  if (sameMaterial > 0) { outColor = c; return; }
  int best = 0, bestN = 0;
  for (int i = 0; i < 8; i++) {
    int n = 0;
    for (int j = 0; j < 8; j++) if (same(nb[i], nb[j])) n++;
    if (n > bestN) { bestN = n; best = i; }
  }
  outColor = bestN >= 2 ? nb[best] : c;
}`;

/** Pass 2: outlines, sky, fade. */
export const FINAL = COMMON + /* glsl */ `
uniform sampler2D depthMap;
uniform sampler2D ramps;
uniform vec3 uSky;
uniform vec3 fadeColor;
uniform float fade;
uniform float uSkyBands;
uniform float uNear, uFar, uOrtho, uGap;
uniform vec3 uInk;
float depthAt(ivec2 p) {
  float d = texelFetch(depthMap, clampP(p), 0).r;
  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : (uNear * uFar) / (uFar - d * (uFar - uNear));
}
float bayer(ivec2 p) {
  int x = p.x & 3, y = p.y & 3, i = x + y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
void main() {
  ivec2 p = ivec2(floor(vUv * lowSize));
  vec4 c = at(p);
  int code = codeOf(c);
  vec3 col = c.rgb;
  bool isSky = code == 0 && all(lessThan(abs(c.rgb - uSky), vec3(0.006)));
  if (isSky) {
    // the only dithering in the picture: a three-band ordered gradient in the open sky
    float t = vUv.y;
    float lvl = clamp((1.0 - t) * uSkyBands * 3.0, 0.0, 3.0);
    float stepUp = floor(lvl) + (fract(lvl) > bayer(p) ? 1.0 : 0.0);
    col = mix(uSky, mix(uSky, vec3(1.0), 0.45), stepUp / 3.0 * min(uSkyBands, 1.0));
  }
  float d = depthAt(p);
  bool far = code == 0 || inked(code);
  float edge = 0.0, silhouette = 0.0;
  if (far) {
    for (int i = 0; i < 4; i++) {
      vec4 n = at(p + N8[i]);
      int kn = codeOf(n);
      if (!inked(kn)) continue;
      if (code == 0) { silhouette = 1.0; break; }
      if (d - depthAt(p + N8[i]) > uGap) edge = 1.0;
    }
  }
  if (silhouette > 0.5 && code == 0) col = uInk;
  else if (edge > 0.5) {
    int ramp = (code >= 201 ? code - 201 : code - 1);
    vec3 dark = texelFetch(ramps, ivec2(0, ramp), 0).rgb;
    col = mix(dark, uInk, 0.55);
  }
  outColor = vec4(mix(col, fadeColor, fade), 1.0);
}`;
