import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateSpiralPath } from '../../utils/geometry';
import { TREE_CONFIG, COLORS } from '../../constants';
import { useStore } from '../../store';
import { TreeMorphState } from '../../types';
import './Shaders';

const Ribbon: React.FC = () => {
  // @ts-ignore
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { ribbonProgress, treeState } = useStore((state) => state);
  
  // Use slightly larger radius than tree to wrap around it
  const path = useMemo(
    () => generateSpiralPath(TREE_CONFIG.treeHeight, TREE_CONFIG.treeRadius + 0.2, 5.5),
    []
  );

  const { positions, progressAttr, scales } = useMemo(() => {
    // Increased count for higher density (3000 -> 5000)
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const prog = new Float32Array(count);
    const sc = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        // Sample along curve
        const t = i / count;
        const point = path.getPointAt(t);
        
        // Add spread/volume to the ribbon
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.4; // Thickness
        
        pos[i * 3] = point.x + Math.cos(angle) * radius;
        pos[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.3; // More vertical jitter
        pos[i * 3 + 2] = point.z + Math.sin(angle) * radius;
        
        // 0 at bottom, 1 at top
        prog[i] = t;
        sc[i] = Math.random();
    }
    
    return { positions: pos, progressAttr: prog, scales: sc };
  }, [path]);

  const color = useMemo(() => new THREE.Color(COLORS.ribbon), []);

  useFrame(({ clock }, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      
      let targetOpacity = 0.0;

      // VISIBILITY RULES:
      // 1. Visible ONLY during RIDE_RIBBON phase.
      // 2. Start fading out once progress reaches ~99% (When star lights up).
      
      if (treeState === TreeMorphState.RIDE_RIBBON) {
          if (ribbonProgress < 0.99) {
              targetOpacity = 1.0;
          } else {
              // Fade out during the 1.0s wait period before camera moves
              targetOpacity = 0.0;
          }
      } else {
          // Hide in all other states (RIDE, RIDE_PREPARE, SCATTERED, etc.)
          targetOpacity = 0.0;
      }
      
      // Smooth fade transition
      const currentOpacity = materialRef.current.uniforms.uOpacityMultiplier.value;
      materialRef.current.uniforms.uOpacityMultiplier.value = THREE.MathUtils.lerp(
          currentOpacity,
          targetOpacity,
          delta * 3.0 // Reasonable fade speed
      );
      
      materialRef.current.uniforms.uVisibleProgress.value = ribbonProgress;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aProgress" count={progressAttr.length} array={progressAttr} itemSize={1} />
        <bufferAttribute attach="attributes-aScale" count={scales.length} array={scales} itemSize={1} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <ribbonParticleMaterial 
        ref={materialRef} 
        uColor={color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Ribbon;