import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG } from '../../constants';
import { useStore } from '../../store';
import { TreeMorphState } from '../../types';

const Star: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const starMeshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const { morphProgress, treeState, ribbonProgress } = useStore((state) => state);

  // Initial Y Position at top of tree
  const initialY = TREE_CONFIG.treeHeight / 2 + 0.25;

  // Generate 5-Pointed Star Geometry
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.5; 
    const innerRadius = 0.22;
    for (let i = 0; i < points * 2; i++) {
        const theta = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    const extrudeSettings = { steps: 1, depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !starMeshRef.current) return;

    // --- VISIBILITY & SCALE ---
    // Normally visible if tree formed
    let visible = morphProgress > 0.85;
    let targetScale = visible ? 1.0 : 0.0;
    
    // --- SPECIAL ANIMATION: RIBBON ARRIVAL ---
    // When Ribbon reaches 95%+, trigger a "Light Up" flash
    const isRibbonArriving = treeState === TreeMorphState.RIDE_RIBBON && ribbonProgress > 0.95;
    
    if (isRibbonArriving) {
        // Pop scale slightly
        targetScale = 1.3; 
    }

    // Smooth Scale Interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
    groupRef.current.scale.setScalar(newScale);

    // Rotation
    groupRef.current.rotation.y = clock.elapsedTime * 1.5; 

    // --- INTENSITY LOGIC ---
    if (lightRef.current && starMeshRef.current) {
        const mat = starMeshRef.current.material as THREE.MeshStandardMaterial;
        
        let targetIntensity = 2.0;
        
        if (isRibbonArriving) {
             // Flash!
             targetIntensity = 8.0; 
        } else if (treeState === TreeMorphState.RIDE_FIREWORK) {
             // Finale Glow
             targetIntensity = 4.0 + Math.sin(clock.elapsedTime * 3.0);
        }

        // Smoothly interpolate intensity
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.1);
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[0, initialY, 0]}>
      <mesh ref={starMeshRef} geometry={starGeometry} castShadow>
        <meshStandardMaterial 
            color="#ffd700"
            emissive="#ffaa00"
            emissiveIntensity={2.0}
            roughness={0.2}
            metalness={0.8}
            toneMapped={false}
        />
      </mesh>
      
      <pointLight ref={lightRef} color="#ffcc00" distance={15} decay={2.0} />
    </group>
  );
};

export default Star;