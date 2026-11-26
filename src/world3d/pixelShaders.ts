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

/** Pass 2: outlines, dynamic pixel-art Hong Kong sky backdrop, fade. */
export const FINAL = COMMON + /* glsl */ `
uniform sampler2D depthMap;
uniform sampler2D ramps;
uniform vec3 uSky;
uniform vec3 fadeColor;
uniform float fade;
uniform float uSkyBands;
uniform float uNear, uFar, uOrtho, uGap;
uniform vec3 uInk;
uniform float uTime;
uniform vec2 uCursor;
uniform float uYaw;
uniform float uAgeK;
uniform float uIndoor;

float depthAt(ivec2 p) {
  float d = texelFetch(depthMap, clampP(p), 0).r;
  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : (uNear * uFar) / (uFar - d * (uFar - uNear));
}

float bayer(ivec2 p) {
  int x = p.x & 3, y = p.y & 3, i = x + y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}

float hash1(float n) {
  return fract(sin(n * 127.1 + 311.7) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Quantized pixel-art cloud mask: flat base, puffy multi-lobe cumulus top, returns 0=none, 1=shadow, 2=lit
float cloudLayer(float u, float y, float yBase, float height, float scale, float seed) {
  float cell = floor(u * scale);
  float fx = fract(u * scale);
  float present = hash1(cell + seed * 19.3);
  if (present < 0.38) return 0.0;
  float w = 0.44 + 0.34 * hash1(cell * 1.7 + seed * 7.1);
  float cx = 0.5 + (hash1(cell * 2.3 + seed * 3.7) - 0.5) * (0.85 - w);
  float lx = (fx - cx) / max(w * 0.5, 0.01);
  if (abs(lx) > 1.0) return 0.0;
  float base = yBase + (hash1(cell * 3.1 + seed) - 0.5) * 0.045;
  if (y < base) return 0.0;
  // three overlapping rounded lobes for crisp pixel cumulus silhouettes
  float l0 = sqrt(max(0.0, 1.0 - lx * lx));
  float l1 = sqrt(max(0.0, 1.0 - pow((lx + 0.42) / 0.58, 2.0))) * 0.78;
  float l2 = sqrt(max(0.0, 1.0 - pow((lx - 0.45) / 0.55, 2.0))) * 0.72;
  float top = base + max(l0, max(l1, l2)) * height * (0.75 + 0.4 * hash1(cell * 5.3 + seed));
  if (y > top) return 0.0;
  float rel = (y - base) / max(top - base, 0.001);
  return rel > 0.34 ? 2.0 : 1.0;
}

// Iconic Hong Kong Victoria Peak + Lion Rock horizon ridge profile (periodic in angle)
float hkRidge(float a) {
  float w = a;
  // gentle multi-harmonic mountain spine
  float h = 0.042
    + 0.026 * sin(w * 1.0 + 0.4)
    + 0.018 * sin(w * 2.0 - 0.9)
    + 0.011 * sin(w * 3.0 + 1.7)
    + 0.006 * sin(w * 5.0 - 0.3);
  // Victoria Peak broad dome near angle ~ 0.9 rad (mod 2pi)
  float dPeak = mod(w - 0.9 + 3.14159265, 6.2831853) - 3.14159265;
  float peak = 0.055 * exp(-dPeak * dPeak * 3.2);
  // Lion Rock iconic crouching crag near angle ~ -1.5 rad (mod 2pi)
  float dLion = mod(w + 1.5 + 3.14159265, 6.2831853) - 3.14159265;
  float lionHead = 0.048 * exp(-pow((dLion - 0.08) * 4.8, 2.0));
  float lionBack = 0.032 * exp(-pow((dLion + 0.36) * 2.6, 2.0));
  return max(0.012, h + peak + max(lionHead, lionBack));
}

vec3 renderSky(ivec2 p) {
  vec2 pUv = (vec2(p) + 0.5) / lowSize;
  float aspect = lowSize.x / max(lowSize.y, 1.0);
  float bay = bayer(p);
  float lum = dot(uSky, vec3(0.299, 0.587, 0.114));
  float storm = clamp((0.68 - lum) * 2.4, 0.0, 1.0);
  vec2 cur = clamp(uCursor, vec2(-1.0), vec2(1.0));
  float curLen = length(cur);

  // Life-stage atmosphere: age 18 crisp morning -> midlife vivid midday -> age 65 warm golden-hour sunset
  float kMid = clamp(uAgeK / 0.45, 0.0, 1.0);
  float kEve = clamp((uAgeK - 0.45) / 0.55, 0.0, 1.0);

  vec3 zMorn = mix(uSky, vec3(0.42, 0.72, 0.98), 0.55);
  vec3 mMorn = mix(uSky, vec3(0.68, 0.89, 1.00), 0.48);
  vec3 hMorn = vec3(1.00, 0.94, 0.84);

  vec3 zMid = mix(uSky, vec3(0.27, 0.62, 0.96), 0.52);
  vec3 mMid = mix(uSky, vec3(0.60, 0.87, 1.00), 0.48);
  vec3 hMid = vec3(0.93, 0.97, 1.00);

  vec3 zEve = mix(uSky, vec3(0.32, 0.44, 0.76), 0.58);
  vec3 mEve = mix(uSky, vec3(0.96, 0.68, 0.52), 0.56);
  vec3 hEve = vec3(1.00, 0.84, 0.54);

  vec3 zenith = mix(mix(zMorn, zMid, kMid), zEve, kEve);
  vec3 midCol = mix(mix(mMorn, mMid, kMid), mEve, kEve);
  vec3 horizon = mix(mix(hMorn, hMid, kMid), hEve, kEve);

  // Crash / overcast skies stay moody and faithful to uSky
  zenith = mix(zenith, uSky * 0.72, storm * 0.90);
  midCol = mix(midCol, uSky, storm * 0.88);
  horizon = mix(horizon, mix(uSky, vec3(0.72, 0.77, 0.86), 0.35), storm * 0.88);

  // Perspective multi-stop Bayer-dithered sky gradient
  float gy = clamp(pUv.y - cur.y * 0.025, 0.0, 1.0);
  float bands = max(1.0, uSkyBands * 6.0);
  float qy = clamp((floor(gy * bands) + (fract(gy * bands) > bay ? 1.0 : 0.0)) / bands, 0.0, 1.0);
  vec3 col = qy < 0.46
    ? mix(horizon, midCol, qy / 0.46)
    : mix(midCol, zenith, (qy - 0.46) / 0.54);

  // Soft warm sun glow in open sky + subtle cursor-reactive light halo
  float yawNorm = uYaw / 6.2831853;
  vec2 sunPos = vec2(fract(0.76 - yawNorm * 0.25 + cur.x * 0.03), mix(0.80, 0.54, kEve) + cur.y * 0.02);
  vec2 sd = vec2((pUv.x - sunPos.x) * aspect, pUv.y - sunPos.y);
  float sunGlow = exp(-dot(sd, sd) * 14.0) * (1.0 - storm * 0.88) * mix(0.32, 0.48, kEve);
  vec3 sunTint = mix(vec3(1.0, 0.98, 0.86), vec3(1.0, 0.86, 0.58), kEve);
  float sunStep = floor(sunGlow * 4.0 + bay) / 4.0;
  col = mix(col, sunTint, clamp(sunStep, 0.0, 0.55));

  // Diagonal sunlit shafts in upper sky
  float beamPhase = (pUv.x * aspect * 1.35 - pUv.y * 0.85 - yawNorm * 0.55 + cur.x * 0.06) * 5.2 + uTime * 0.08;
  float beamWave = pow(max(0.0, sin(beamPhase) * 0.5 + 0.5), 4.0);
  float beamMask = smoothstep(0.24, 0.58, pUv.y) * (1.0 - smoothstep(0.84, 0.99, pUv.y));
  float beam = beamWave * beamMask * (1.0 - storm * 0.92) * mix(0.14, 0.20, kEve) * mix(1.0, 0.72, uIndoor);
  if (beam > bay * 0.22) col = mix(col, sunTint, 0.14);

  // Subtle cursor-reactive light halo (exact 0 when pointer is idle at 0,0)
  if (curLen > 0.001) {
    vec2 curUv = vec2(0.5 + cur.x * 0.36, 0.5 + cur.y * 0.32);
    vec2 cd = vec2((pUv.x - curUv.x) * aspect, pUv.y - curUv.y);
    float halo = exp(-dot(cd, cd) * 9.0) * min(curLen, 1.0) * (1.0 - storm * 0.65) * 0.16;
    if (halo > bay * 0.18) col = mix(col, sunTint, 0.14);
  }

  // Two parallax layers of drifting sunlit pixel clouds
  vec3 cloudLit = mix(mix(vec3(1.0, 0.99, 0.96), vec3(1.0, 0.89, 0.76), kEve), mix(uSky, vec3(0.80, 0.84, 0.91), 0.35), storm * 0.85);
  vec3 cloudShade = mix(mix(midCol, vec3(0.76, 0.84, 0.95), 0.45), vec3(0.76, 0.60, 0.64), kEve * 0.55);
  cloudShade = mix(cloudShade, uSky * 0.78, storm * 0.85);

  float uFarCloud = pUv.x * aspect * 1.25 + uYaw * 0.38 + uTime * 0.009 + cur.x * 0.035;
  float cFar = cloudLayer(uFarCloud, pUv.y - cur.y * 0.015, 0.66, 0.075, 1.35, 1.0);
  if (cFar > 0.5) {
    vec3 cc = cFar > 1.5 ? mix(col, cloudLit, 0.72) : mix(col, cloudShade, 0.58);
    col = cc;
  }

  float uNearCloud = pUv.x * aspect * 0.95 + uYaw * 0.68 + uTime * 0.018 + cur.x * 0.070;
  float cNear = cloudLayer(uNearCloud, pUv.y - cur.y * 0.025, 0.48, 0.095, 1.05, 4.0);
  if (cNear > 0.5) {
    vec3 cc = cNear > 1.5 ? mix(col, cloudLit, 0.88) : mix(col, cloudShade, 0.76);
    col = cc;
  }

  // Floating sunlit pixel motes in the open sky
  if (storm < 0.45 && pUv.y > 0.32) {
    vec2 mCoord = vec2(p.x + int(floor((uYaw * 36.0 + cur.x * 10.0))), p.y - int(floor(uTime * 5.0 + cur.y * 6.0)));
    vec2 mCell = floor(mCoord / 18.0);
    vec2 mLocal = mod(mCoord, 18.0);
    float mSeed = hash2(mCell);
    if (mSeed > 0.84) {
      vec2 mPos = floor(vec2(hash2(mCell + 1.3), hash2(mCell + 2.9)) * 14.0) + 2.0;
      float tw = 0.5 + 0.5 * sin(uTime * 2.2 + mSeed * 25.0);
      if (all(lessThan(abs(mLocal - mPos), vec2(0.6))) && tw > 0.58) {
        col = mix(col, vec3(1.0, 0.98, 0.88), mix(0.45, 0.65, kEve));
      }
    }
  }

  // Distant Hong Kong Victoria Peak / Lion Rock mountain silhouette + far harbour skyline
  float horizonY = mix(0.21, 0.14, uIndoor) - cur.y * 0.028;
  float mAngle = (pUv.x - 0.5) * aspect * 0.70 + uYaw * 0.62 + cur.x * 0.045;
  float ridgeH = hkRidge(mAngle);
  float ridgeTop = horizonY + ridgeH;

  vec3 mtnBase = mix(midCol, vec3(0.32, 0.45, 0.64), 0.48);
  mtnBase = mix(mtnBase, vec3(0.45, 0.38, 0.56), kEve * 0.55);
  mtnBase = mix(mtnBase, uSky * 0.62, storm * 0.78);
  vec3 mtnCrest = mix(mtnBase, horizon, 0.28);

  if (pUv.y < ridgeTop) {
    float depthFromCrest = (ridgeTop - pUv.y) / max(ridgeH, 0.01);
    float haze = clamp(1.0 - depthFromCrest * 0.75, 0.0, 1.0);
    vec3 mc = depthFromCrest < 0.08 ? mtnCrest : mix(mtnBase, horizon, (1.0 - haze) * 0.22);
    col = mix(col, mc, mix(0.86, 0.72, uIndoor));
  }

  // Far-off harbour skyline along the horizon band with stronger parallax
  float sSpan = (pUv.x - 0.5) * aspect * 1.05 + uYaw * 0.96 + cur.x * 0.085;
  float bIdx = floor(sSpan * 24.0);
  float bFx = fract(sSpan * 24.0);
  float bRnd = hash1(bIdx * 1.37 + 11.0);
  // Leave harbour gaps so the mountain silhouette breathes through
  float bExist = step(0.28, bRnd);
  float bTier = hash1(bIdx * 3.11 + 5.0);
  float bTall = bTier > 0.86 ? 0.072 : bTier > 0.55 ? 0.042 : 0.022;
  float bH = bExist * (bTall + 0.016 * hash1(bIdx * 7.3));
  // Tapered skyscraper spire on the tallest towers
  bool inBody = bFx > 0.12 && bFx < 0.88;
  bool inSpire = bTier > 0.86 && bFx > 0.42 && bFx < 0.58;
  float skyTop = horizonY - 0.008 + (inSpire ? bH * 1.18 : inBody ? bH : 0.0);

  vec3 cityCol = mix(mtnBase * 0.82, vec3(0.24, 0.33, 0.50), 0.45);
  cityCol = mix(cityCol, vec3(0.36, 0.28, 0.46), kEve * 0.48);
  cityCol = mix(cityCol, uSky * 0.52, storm * 0.75);

  if (pUv.y < skyTop && pUv.y >= horizonY - 0.035) {
    float cFade = clamp((skyTop - pUv.y) / max(bH, 0.02), 0.0, 1.0);
    vec3 bc = mix(cityCol, horizon, cFade * 0.30);
    // Tiny warm pixel windows on taller skyline towers (glowing more at golden hour / storm)
    float winChance = mix(0.18, 0.65, max(kEve, storm));
    if (inBody && bTier > 0.55 && ((p.x & 1) == 0) && ((p.y & 1) == 0) && pUv.y < skyTop - 0.006 && pUv.y > horizonY) {
      float wr = hash2(vec2(float(p.x) + floor(uYaw * 40.0), float(p.y)));
      if (wr > 1.0 - winChance * 0.22) {
        bc = mix(bc, vec3(1.0, 0.90, 0.62), mix(0.45, 0.82, max(kEve, storm)));
      }
    }
    col = mix(col, bc, mix(0.88, 0.72, uIndoor));
  }

  // Harbour atmospheric mist + soft water shimmer below the horizon line
  float mistTop = horizonY - 0.006;
  if (pUv.y < mistTop) {
    float md = clamp((mistTop - pUv.y) / max(mistTop, 0.01), 0.0, 1.0);
    vec3 waterHaze = mix(horizon, mix(uSky, vec3(0.62, 0.82, 0.92), 0.4), 0.45);
    waterHaze = mix(waterHaze, vec3(0.96, 0.78, 0.60), kEve * 0.35 * (1.0 - storm));
    waterHaze = mix(waterHaze, uSky * 0.75, storm * 0.82);
    float qm = floor(md * 3.0 + bay) / 3.0;
    col = mix(horizon, waterHaze, clamp(qm, 0.0, 1.0));
    // crisp pixel shimmer dashes along the distant harbour water
    if ((p.y & 3) == 1) {
      float sh = sin(float(p.x) * 0.22 + uYaw * 18.0 + uTime * 1.1 + float(p.y) * 1.7);
      if (sh > 0.78) col = mix(col, sunTint, 0.24 * (1.0 - storm * 0.7));
    }
  }

  return mix(uSky, col, min(uSkyBands, 1.0));
}

void main() {
  ivec2 p = ivec2(floor(vUv * lowSize));
  vec4 c = at(p);
  int code = codeOf(c);
  vec3 col = c.rgb;
  bool isSky = code == 0 && all(lessThan(abs(c.rgb - uSky), vec3(0.006)));
  if (isSky) {
    col = renderSky(p);
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
