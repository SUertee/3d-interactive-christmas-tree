import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import ChristmasTree from './TreeSystem';
import WishSystem from './WishSystem';
import Snow from './Snow';
import CameraRig from './CameraRig';
import { COLORS } from '../constants';

const Scene: React.FC = () => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ 
        antialias: false, 
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true
      }}
    >
      <color attach="background" args={[COLORS.background]} />
      
      {/* 
         Camera Position: 
         - Further back (Z=50) to ensure full tree visibility including base rings.
         - Positioned higher (Y=6) for a better angle.
      */}
      <PerspectiveCamera makeDefault position={[0, 6, 50]} fov={40} />
      
      {/* Camera Rig handles all controls (Mouse, Keyboard, Gesture) */}
      <CameraRig />

      {/* Lighting */}
      <ambientLight intensity={0.1} color="#330011" />
      <spotLight 
        position={[20, 30, 10]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#fff0f5" 
      />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#ffaa00" />

      {/* 
         Content Group: 
         - Positioned at Y=-2 to elevate the tree structure relative to the center 
      */}
      <group position={[0, -2, 0]}>
        <ChristmasTree />
        <WishSystem />
      </group>
      
      <Snow />

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        {/* Cinematic Bloom */}
        <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6} 
            levels={8}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      
      <Environment preset="city" />
    </Canvas>
  );
};

export default Scene;