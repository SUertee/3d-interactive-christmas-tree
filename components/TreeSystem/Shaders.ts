import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// --- Foliage Morph Shader ---
export const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uPixelRatio: 1,
    uSize: 8.0, 
    uBoost: 0.0, // Energy Boost for Wish absorption
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uProgress;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uBoost;

    attribute vec3 aTargetPosition;
    attribute float aScale;
    attribute vec3 aColor;

    varying vec3 vColor;
    varying float vAlpha;

    // Easing function
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      // Mix color with white/gold based on Boost
      vec3 boostColor = vec3(1.0, 1.0, 0.8); // Golden white
      vColor = mix(aColor, boostColor, uBoost * 0.8);
      
      float t = easeInOutCubic(uProgress);
      
      // Basic position mix
      vec3 pos = mix(position, aTargetPosition, t);
      
      // --- Floating / Breathing Animation ---
      float floatY = sin(uTime * 1.0 + pos.x * 0.5) * 0.15;
      float driftX = cos(uTime * 0.8 + pos.y * 0.5) * 0.05;
      float driftZ = sin(uTime * 0.7 + pos.y * 0.5) * 0.05;
      
      pos.y += floatY * t; 
      pos.x += driftX * t;
      pos.z += driftZ * t;
      
      // Expansion on Boost (Shockwave effect)
      vec3 dir = normalize(pos);
      pos += dir * uBoost * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float scatterScale = mix(4.0, 1.0, t);
      float breath = 1.0 + 0.3 * sin(uTime * 3.0 + pos.y * 2.0 + pos.x);
      
      // Size increase on Boost
      float boostScale = 1.0 + uBoost * 2.0;

      gl_PointSize = uSize * aScale * breath * scatterScale * boostScale * uPixelRatio * (20.0 / -mvPosition.z);
      
      float seed = dot(aTargetPosition, vec3(12.9898, 78.233, 151.7182));
      float blink = sin(uTime * 4.0 + seed);
      float twinkleAlpha = 0.3 + 0.7 * (0.5 + 0.5 * blink);
      
      // Boost makes everything solid
      vAlpha = mix(mix(twinkleAlpha, 1.0, t), 1.0, uBoost);
    }
  `,
  // Fragment Shader
  `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 uv = gl_PointCoord.xy - 0.5;
      float r = length(uv);
      if (r > 0.5) discard;
      
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 2.0); 
      
      gl_FragColor = vec4(vColor, vAlpha * glow);
    }
  `
);

// --- Base Rings Shader ---
export const RingMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#ffd700'),
  },
  `
    uniform float uTime;
    varying float vAngle;
    
    void main() {
      vec3 pos = position;
      
      // Rotate the rings slowly
      float angle = uTime * 0.2;
      float c = cos(angle);
      float s = sin(angle);
      
      // Rotate around Y
      float x = pos.x * c - pos.z * s;
      float z = pos.x * s + pos.z * c;
      pos.x = x;
      pos.z = z;
      
      // Gentle wave
      pos.y += sin(pos.x * 0.5 + uTime) * 0.1;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = 3.0 * (15.0 / -mvPosition.z);
      
      vAngle = atan(pos.x, pos.z);
    }
  `,
  `
    uniform vec3 uColor;
    void main() {
      float r = length(gl_PointCoord.xy - 0.5);
      if (r > 0.5) discard;
      
      // Simple gold particle
      float glow = 1.0 - (r * 2.0);
      gl_FragColor = vec4(uColor, glow);
    }
  `
);

// --- Ribbon Particle Shader ---
export const RibbonParticleMaterial = shaderMaterial(
  {
    uTime: 0,
    uVisibleProgress: 0, // 0 to 1
    uOpacityMultiplier: 1.0,
    uColor: new THREE.Color('#fcd34d'),
  },
  // Vertex
  `
    uniform float uTime;
    uniform float uVisibleProgress;
    uniform float uOpacityMultiplier;
    attribute float aProgress; // 0..1 along curve
    attribute float aScale;
    
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      
      // Gentle floating logic
      pos.y += sin(uTime * 2.0 + aProgress * 10.0) * 0.1;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      // INCREASED BASE SIZE (was 4.0 -> 8.0) for thicker look
      gl_PointSize = (8.0 * aScale + 4.0) * (20.0 / -mvPosition.z);
      
      // Visibility Logic: progressive reveal
      // If point's progress is greater than visible progress, alpha is 0
      // Use smoothstep for soft leading edge
      float visible = smoothstep(aProgress + 0.05, aProgress, uVisibleProgress);
      
      // Twinkle
      float twinkle = 0.5 + 0.5 * sin(uTime * 5.0 + aProgress * 20.0);
      
      vAlpha = visible * twinkle * uOpacityMultiplier;
    }
  `,
  // Fragment
  `
    uniform vec3 uColor;
    varying float vAlpha;
    
    void main() {
      if (vAlpha < 0.01) discard;
      
      vec2 uv = gl_PointCoord.xy - 0.5;
      float r = length(uv);
      if (r > 0.5) discard;
      
      // Soft particle
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 1.5);
      
      gl_FragColor = vec4(uColor, vAlpha * glow);
    }
  `
);

// --- Wish Particle Shader (Magic Energy Ball) ---
export const WishParticleMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorCore: new THREE.Color('#ff1493'), // Deep Pink
    uColorGlow: new THREE.Color('#ff7f50'), // Coral
  },
  `
    uniform float uTime;
    attribute float aSize;
    attribute float aOffset;
    
    varying float vAlpha;
    varying vec3 vColor;
    
    void main() {
       vec3 pos = position;
       
       // Jitter position for "Energy Ball" feel
       pos.x += sin(uTime * 10.0 + aOffset) * 0.05;
       pos.y += cos(uTime * 8.0 + aOffset) * 0.05;
       pos.z += sin(uTime * 9.0 + aOffset) * 0.05;

       vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
       gl_Position = projectionMatrix * mvPosition;
       
       // Size attenuation
       gl_PointSize = aSize * (30.0 / -mvPosition.z);
       
       vAlpha = 1.0;
    }
  `,
  `
    uniform vec3 uColorCore;
    uniform vec3 uColorGlow;
    
    varying float vAlpha;

    void main() {
        vec2 uv = gl_PointCoord.xy - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;
        
        // Soft Glow
        float glow = 1.0 - (r * 2.0);
        glow = pow(glow, 1.5); 
        
        // Color mix based on radius
        // Center is Pink, Edge is Coral -> White
        vec3 c = mix(uColorGlow, uColorCore, 1.0 - r * 2.0);
        
        // Add white hot center
        if (r < 0.1) c += 0.5;

        gl_FragColor = vec4(c, glow);
    }
  `
);

extend({ FoliageMaterial, RibbonParticleMaterial, RingMaterial, WishParticleMaterial });