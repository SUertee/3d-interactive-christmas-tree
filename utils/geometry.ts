import * as THREE from 'three';
import { TREE_CONFIG } from '../constants';

// Generate random point in sphere
export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Cubic root for uniform distribution
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Generate point inside a cone (Tree shape) with Vertical Bias
// bottomBias: 1 = linear, > 1 = bottom heavy, < 1 = top heavy
export const getTreeConePoint = (height: number, maxRadius: number, yOffset: number = 0, bottomBias: number = 1): THREE.Vector3 => {
  // y goes from 0 to height
  // We use Math.pow to skew distribution towards 0 (bottom)
  const rand = Math.random();
  const y = Math.pow(rand, bottomBias) * height;
  
  // Radius at this height (linear taper)
  const rAtY = (1 - y / height) * maxRadius;
  
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * rAtY; // Sqrt for uniform disk distribution
  
  return new THREE.Vector3(
    r * Math.cos(angle),
    y - height / 2 + yOffset, // Center vertically
    r * Math.sin(angle)
  );
};

// Generate Ribbon Spiral Path
export const generateSpiralPath = (height: number, maxRadius: number, turns: number = 5): THREE.CatmullRomCurve3 => {
  const points: THREE.Vector3[] = [];
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 to 1 (bottom to top)
    const y = t * height - (height / 2);
    const radius = (1 - t) * maxRadius + 0.5; // Taper radius towards top, keep small offset
    const angle = t * Math.PI * 2 * turns;
    
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    ));
  }
  
  return new THREE.CatmullRomCurve3(points);
};

// Generate Geometry Attributes
export const generateTreeAttributes = (count: number, type: 'foliage' | 'ornament') => {
  const chaosPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  
  const greenDark = new THREE.Color('#0f4d22');
  const greenLight = new THREE.Color('#4ade80');
  const accent1 = new THREE.Color('#ffd700'); // Gold
  const accent2 = new THREE.Color('#ff0066'); // Pink/Red
  const accent3 = new THREE.Color('#ffffff'); // White sparkle

  // Distribution settings
  // Foliage: Slight bottom bias (1.5) to look grounded but full
  // Ornaments: Strong bottom bias (2.5) to keep top clean and bottom rich
  const bias = type === 'ornament' ? 2.5 : 1.5;

  for (let i = 0; i < count; i++) {
    // Chaos Position
    const chaos = getRandomSpherePoint(TREE_CONFIG.chaosRadius);
    chaosPositions[i * 3] = chaos.x;
    chaosPositions[i * 3 + 1] = chaos.y;
    chaosPositions[i * 3 + 2] = chaos.z;

    // Target Position with bias
    const target = getTreeConePoint(TREE_CONFIG.treeHeight, TREE_CONFIG.treeRadius, 0, bias);
    
    // Push ornaments slightly outward to surface
    if (type === 'ornament') {
       const dist = Math.sqrt(target.x * target.x + target.z * target.z);
       if (dist > 0.1) {
           const yFromBase = target.y + TREE_CONFIG.treeHeight/2;
           const yNorm = yFromBase / TREE_CONFIG.treeHeight;
           
           // Recalculate max radius at this specific height
           const maxR = (1 - yNorm) * TREE_CONFIG.treeRadius;
           
           // Push to surface (90-95%)
           const scaler = (maxR / dist) * 0.95; 
           target.x *= scaler;
           target.z *= scaler;
       }
    }

    targetPositions[i * 3] = target.x;
    targetPositions[i * 3 + 1] = target.y;
    targetPositions[i * 3 + 2] = target.z;

    // Scale Logic
    let s = Math.random();
    
    if (type === 'ornament') {
       // Reduce scale based on height. 
       // Items near top (yNorm ~ 1) become smaller.
       const yFromBase = target.y + TREE_CONFIG.treeHeight/2;
       const yNorm = yFromBase / TREE_CONFIG.treeHeight;
       
       // Reduce size by up to 60% at the top
       s *= (1.0 - yNorm * 0.6);
    }
    
    scales[i] = s;

    // Color Logic
    const c = new THREE.Color();
    if (type === 'foliage') {
      const rand = Math.random();
      if (rand > 0.95) {
        // 5% Accents
        const accentRand = Math.random();
        if (accentRand < 0.33) c.copy(accent1);
        else if (accentRand < 0.66) c.copy(accent2);
        else c.copy(accent3);
      } else {
        // 95% Green variations
        c.lerpColors(greenDark, greenLight, Math.random());
      }
    } else {
      c.lerpColors(accent1, accent2, Math.random() > 0.6 ? 1 : 0);
    }
    
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  return { chaosPositions, targetPositions, scales, colors };
};