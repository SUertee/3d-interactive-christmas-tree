import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTreeAttributes } from '../../utils/geometry';
import { TREE_CONFIG } from '../../constants';
import { useStore } from '../../store';
import './Shaders';

const Foliage: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  // @ts-ignore
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const morphProgress = useStore((state) => state.morphProgress);
  const lastAbsorptionTime = useStore((state) => state.lastAbsorptionTime);

  const { chaosPositions, targetPositions, scales, colors } = useMemo(
    () => generateTreeAttributes(TREE_CONFIG.foliageCount, 'foliage'),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = morphProgress;
      materialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr;
      
      // Calculate Boost (Flash after absorption)
      // Flash lasts 1.5 seconds.
      const timeSinceAbsorb = state.clock.elapsedTime - lastAbsorptionTime; // Approximate diff logic requires clock sync
      // Actually, since lastAbsorptionTime is Date.now()/1000, we should use Date.now() here too for consistency,
      // OR use the difference. Store uses Date.now()/1000.
      
      const diff = (Date.now() / 1000) - lastAbsorptionTime;
      let boost = 0;
      if (diff >= 0 && diff < 1.5) {
        // Spike fast to 1.0, decay slowly
        boost = Math.max(0, 1.0 - (diff / 1.5));
        boost = Math.pow(boost, 2); // Nonlinear decay
      }
      materialRef.current.uniforms.uBoost.value = boost;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={chaosPositions.length / 3}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPosition"
          count={targetPositions.length / 3}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial 
        ref={materialRef} 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
        uSize={6.0} // Fine particles
      />
    </points>
  );
};

export default Foliage;