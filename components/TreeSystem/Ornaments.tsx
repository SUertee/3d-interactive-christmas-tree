import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTreeAttributes } from '../../utils/geometry';
import { TREE_CONFIG } from '../../constants';
import { useStore } from '../../store';

// We use a slightly different approach for ornaments: InstancedMesh
// Updating thousands of matrices every frame for morphing is expensive in JS.
// Better to use a vertex shader on the instance.
// But standard InstancedMesh doesn't support custom morph attributes easily without custom material.
// We will use a custom shader material that extends standard material or just a simple shader.
// To keep it high-quality, let's use a standard MeshPhysicalMaterial and modify it via onBeforeCompile 
// or simpler: just update matrices in useFrame if count is low (150 is very low).
// 150 items is negligible for JS CPU update. Let's do CPU update for maximum control and physics potential later.

const dummy = new THREE.Object3D();

const Ornaments: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const morphProgress = useStore((state) => state.morphProgress);

  const { chaosPositions, targetPositions, colors, scales } = useMemo(
    () => generateTreeAttributes(TREE_CONFIG.ornamentCount, 'ornament'),
    []
  );

  // Easing function for JS
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = ease(morphProgress);
    const time = clock.elapsedTime;

    for (let i = 0; i < TREE_CONFIG.ornamentCount; i++) {
      const ix = i * 3;
      
      // Interpolate position
      const cx = chaosPositions[ix];
      const cy = chaosPositions[ix+1];
      const cz = chaosPositions[ix+2];

      const tx = targetPositions[ix];
      const ty = targetPositions[ix+1];
      const tz = targetPositions[ix+2];

      dummy.position.set(
        THREE.MathUtils.lerp(cx, tx, t),
        THREE.MathUtils.lerp(cy, ty, t),
        THREE.MathUtils.lerp(cz, tz, t)
      );

      // Add gentle floating when scattered
      if (morphProgress < 0.5) {
        dummy.position.y += Math.sin(time + i) * 0.02;
      }

      // Scale up when formed
      const s = scales[i] * (0.5 + 0.5 * t);
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TREE_CONFIG.ornamentCount]} castShadow receiveShadow>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial 
        color="#ffd700" 
        roughness={0.1} 
        metalness={0.9} 
        emissive="#ffaa00"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

export default Ornaments;