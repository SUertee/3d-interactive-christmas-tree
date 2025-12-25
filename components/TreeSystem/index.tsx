import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import Gifts from './Gifts';
import Ribbon from './Ribbon';
import Star from './Star';
import BaseRings from './BaseRings';
import Polaroids from './Polaroids';
import CDPlayer from './CDPlayer';
import { useStore } from '../../store';

const ChristmasTree: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const morphProgress = useStore(state => state.morphProgress);
  
  useFrame(() => {
    if (groupRef.current) {
      // Map morphProgress (0 = Open/Scattered, 1 = Closed/Tree) to Scale
      // Open Hand (0) -> Scale 3x
      // Closed Hand (1) -> Scale 1x
      const targetScale = THREE.MathUtils.lerp(3.0, 1.0, morphProgress);
      
      // Smooth interpolation: scaleFactor += (targetScale - scaleFactor) * 0.1
      const currentScale = groupRef.current.scale.x;
      const smoothScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      
      groupRef.current.scale.setScalar(smoothScale);
    }
  });

  return (
    <group ref={groupRef}>
      <Foliage />
      <Ornaments />
      <Gifts />
      <Polaroids />
      {morphProgress > 0.6 && <BaseRings />}
      {morphProgress > 0.6 && <CDPlayer />}
      <Ribbon />
      <Star />
    </group>
  );
};

export default ChristmasTree;
