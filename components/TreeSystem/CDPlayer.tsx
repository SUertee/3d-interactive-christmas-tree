import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG } from '../../constants';

const CDPlayer: React.FC = () => {
  const discRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>>(null);

  const baseY = -TREE_CONFIG.treeHeight / 2 - 0.5;
  const baseX = TREE_CONFIG.treeRadius * 1.65;
  const baseZ = 0;

  const baseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        metalness: 0.6,
        roughness: 0.35,
      }),
    []
  );

  const discMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d9d3c7',
        metalness: 0.8,
        roughness: 0.2,
      }),
    []
  );

  const goldRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffd700',
        transparent: true,
        opacity: 0.65,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (discRef.current) {
      discRef.current.rotation.y = clock.elapsedTime * 0.6;
    }
    if (ringRef.current) {
      const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.0) * 0.08;
      ringRef.current.material.opacity = pulse;
    }
  });

  return (
    <group position={[baseX, baseY, baseZ]}>
      {/* Ground glow ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        material={goldRingMaterial}
      >
        <torusGeometry args={[1.1, 0.06, 16, 64]} />
      </mesh>

      {/* Turntable base */}
      <mesh material={baseMaterial} position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.18, 48]} />
      </mesh>

      {/* Spinning disc */}
      <mesh ref={discRef} material={discMaterial} position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.03, 64]} />
      </mesh>

      {/* Center label */}
      <mesh position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
        <meshStandardMaterial color="#b48c3a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Side control panel */}
      <mesh material={baseMaterial} position={[0.95, 0.14, 0]}>
        <boxGeometry args={[0.4, 0.12, 0.7]} />
      </mesh>
      <mesh position={[1.05, 0.18, 0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[1.05, 0.18, -0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

export default CDPlayer;
