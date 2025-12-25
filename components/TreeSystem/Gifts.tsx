import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTreeAttributes } from '../../utils/geometry';
import { TREE_CONFIG, COLORS } from '../../constants';
import { useStore } from '../../store';

// States for the gift boxes
type GiftState = 'closed' | 'semi' | 'open';

const GiftBoxGeometry: React.FC<{ 
  state: GiftState; 
  color: string; 
}> = ({ state, color }) => {
  // Dimensions
  const size = 0.6;
  const lidHeight = 0.15;
  const boxHeight = 0.5;

  // Material
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.4,
  }), [color]);
  
  const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.4,
    metalness: 0.1,
  }), []);

  // Lid Rotation logic
  const lidRotation = useMemo(() => {
    if (state === 'closed') return 0;
    if (state === 'semi') return -Math.PI / 6; // -30 deg
    if (state === 'open') return -Math.PI / 1.6; // ~ -110 deg
    return 0;
  }, [state]);

  return (
    <group>
      {/* Box Body */}
      <mesh material={material} position={[0, boxHeight/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, boxHeight, size]} />
      </mesh>
      
      {/* Vertical Ribbon on Body */}
      <mesh material={ribbonMaterial} position={[0, boxHeight/2, 0]} castShadow>
        <boxGeometry args={[size + 0.02, boxHeight, size * 0.2]} />
      </mesh>
      <mesh material={ribbonMaterial} position={[0, boxHeight/2, 0]} castShadow>
        <boxGeometry args={[size * 0.2, boxHeight, size + 0.02]} />
      </mesh>

      {/* Lid Group (Pivoted at back edge) */}
      <group position={[0, boxHeight, -size/2]} rotation={[lidRotation, 0, 0]}>
        {/* The Lid itself, offset so pivot is correct */}
        <group position={[0, 0, size/2]}> 
            <mesh material={material} position={[0, lidHeight/2, 0]} castShadow>
                <boxGeometry args={[size + 0.05, lidHeight, size + 0.05]} />
            </mesh>
             {/* Ribbon on Lid */}
            <mesh material={ribbonMaterial} position={[0, lidHeight/2, 0]}>
                <boxGeometry args={[size + 0.07, lidHeight + 0.01, size * 0.2]} />
            </mesh>
            <mesh material={ribbonMaterial} position={[0, lidHeight/2, 0]}>
                <boxGeometry args={[size * 0.2, lidHeight + 0.01, size + 0.07]} />
            </mesh>
        </group>
      </group>
      
      {/* If Open, show a little "light/magic" inside */}
      {state === 'open' && (
        <pointLight position={[0, 0.4, 0]} intensity={1} distance={2} color="#fff" />
      )}
    </group>
  );
};

const Gifts: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const morphProgress = useStore((state) => state.morphProgress);
  const count = TREE_CONFIG.giftCount;

  // Generate Positions using same logic as Ornaments (Surface of tree)
  const { chaosPositions, targetPositions, scales } = useMemo(
    () => generateTreeAttributes(count, 'ornament'), 
    [count]
  );

  // Assign random states and colors
  const giftProps = useMemo(() => {
    return Array.from({ length: count }).map(() => {
        const r = Math.random();
        let state: GiftState = 'closed';
        if (r > 0.6) state = 'semi';
        if (r > 0.85) state = 'open';

        const colors = [COLORS.giftRed, COLORS.giftGreen, COLORS.giftBlue, COLORS.giftGold, COLORS.ornamentRed];
        const color = colors[Math.floor(Math.random() * colors.length)];

        return { state, color };
    });
  }, [count]);

  // Refs for individual gift groups to animate them
  const itemRefs = useRef<THREE.Group[]>([]);

  // Easing function
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  useFrame(({ clock }) => {
    if (groupRef.current) {
        const t = ease(morphProgress);
        const time = clock.elapsedTime;

        itemRefs.current.forEach((ref, i) => {
            if (!ref) return;

            const ix = i * 3;
            // Interpolate position
            const cx = chaosPositions[ix];
            const cy = chaosPositions[ix+1];
            const cz = chaosPositions[ix+2];

            const tx = targetPositions[ix];
            const ty = targetPositions[ix+1];
            const tz = targetPositions[ix+2];

            const x = THREE.MathUtils.lerp(cx, tx, t);
            const y = THREE.MathUtils.lerp(cy, ty, t);
            const z = THREE.MathUtils.lerp(cz, tz, t);

            ref.position.set(x, y, z);

            // Floating effect when scattered
            if (morphProgress < 0.5) {
                ref.position.y += Math.sin(time * 2 + i) * 0.05;
                ref.rotation.x = Math.sin(time + i) * 0.2;
                ref.rotation.z = Math.cos(time + i) * 0.2;
            } else {
                // Stabilize rotation to face outwards or just zero
                // For simplicity, reset rotation, maybe slight random tilt
                ref.rotation.set(0, i, 0); 
            }

            // Scale
            const s = scales[i] * (0.8 + 0.2 * t); // slightly larger
            ref.scale.setScalar(s);
        });
    }
  });

  return (
    <group ref={groupRef}>
        {giftProps.map((props, i) => (
            <group key={i} ref={(el) => { if (el) itemRefs.current[i] = el; }}>
                <GiftBoxGeometry state={props.state} color={props.color} />
            </group>
        ))}
    </group>
  );
};

export default Gifts;