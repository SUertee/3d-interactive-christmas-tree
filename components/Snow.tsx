import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

const Snow: React.FC = () => {
  const count = 2000; 
  const mesh = useRef<THREE.Points>(null);
  const simulatedTime = useRef(0);
  
  // Pre-compute all attributes to ensure TRUE randomness for every single particle
  const { positions, speeds, randomOffsets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count); // Individual speed for each snowflake
    const rnd = new Float32Array(count); // Individual phase offset for drift
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60; 
      
      // Random speed: Range from 1.5 to 4.5 units/sec
      // This prevents "layers" of snow falling at the exact same speed
      spd[i] = 1.5 + Math.random() * 3.0; 
      
      // Random phase for horizontal drift so they don't wave in sync
      rnd[i] = Math.random() * 100;
    }
    return { positions: pos, speeds: spd, randomOffsets: rnd };
  }, []);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    
    const store = useStore.getState();
    const morphProgress = store.morphProgress;
    const isFlyingWish = store.isFlyingWish;

    // Time Dilation Logic
    const targetSpeed = isFlyingWish ? 0.05 : 1.0;
    
    // Smoothly interpolate current delta modifier
    const speedFactor = THREE.MathUtils.damp(
        mesh.current.userData.speed || 1.0, 
        targetSpeed, 
        2.0, // lambda
        delta
    );
    mesh.current.userData.speed = speedFactor;
    
    // Advance simulated time
    simulatedTime.current += delta * speedFactor;
    const t = simulatedTime.current;

    const currentPositions = mesh.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      let y = currentPositions[i * 3 + 1];
      
      // Retrieve unique random speed for this particle
      const baseSpeed = speeds[i];
      
      // Fall down
      // Morph Progress affects speed (Matrix freeze effect style)
      y -= baseSpeed * delta * speedFactor * (0.2 + 0.8 * morphProgress); 
      
      // Horizontal drift (Wind)
      // Use unique random offset to prevent synchronized waving
      const drift = Math.sin(t * 0.5 + randomOffsets[i]) * 0.05 * morphProgress;
      currentPositions[i * 3] += drift * speedFactor; 
      
      // Respawn Logic
      if (y < -40) {
        // Reset to top with RANDOMIZED offset
        // Instead of resetting to exactly 40, we add a random variance (0 to 15).
        // This prevents a "horizontal line" of snow appearing at the top.
        y = 40 + Math.random() * 15;
        
        // Also randomize X and Z slightly on respawn so it's not the exact same particle loop
        currentPositions[i * 3] = (Math.random() - 0.5) * 100;
        currentPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
      currentPositions[i * 3 + 1] = y;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        color="#ffffff" 
        size={0.2} 
        transparent 
        opacity={0.8} 
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Snow;