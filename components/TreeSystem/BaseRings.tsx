import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG } from '../../constants';
import './Shaders';

const BaseRings: React.FC = () => {
  // @ts-ignore
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Increased count significantly for "High Density" look (was 600)
  const pointsCount = 4500;

  const positions = useMemo(() => {
    const pos = new Float32Array(pointsCount * 3);
    const radiusBase = TREE_CONFIG.treeRadius;
    
    for (let i = 0; i < pointsCount; i++) {
      let r = radiusBase;
      const ringIndex = i % 3;
      
      // Radius multipliers: 1.1x, 1.3x, 1.5x (up to 150%)
      if (ringIndex === 0) r *= 1.1;
      if (ringIndex === 1) r *= 1.3;
      if (ringIndex === 2) r *= 1.5;

      // Add slight noise to radius for a "thicker" band feel, not just a thin line
      r += (Math.random() - 0.5) * 0.2;

      // Even distribution around the circle
      const theta = (i / pointsCount) * Math.PI * 2 * 3 + Math.random() * 0.5; 
      
      // Position at bottom of tree
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = -TREE_CONFIG.treeHeight / 2 - 0.5; 
      pos[i * 3 + 2] = r * Math.sin(theta);
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={pointsCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <ringMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uColor={new THREE.Color('#ffd700')}
      />
    </points>
  );
};

export default BaseRings;