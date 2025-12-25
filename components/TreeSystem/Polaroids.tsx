import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { getRandomSpherePoint } from "../../utils/geometry";
import { TREE_CONFIG, COLORS, STATIC_PHOTO_FILES } from "../../constants";
import { useStore } from "../../store";

const buildPhotoUrl = (filename: string): string => {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}static/photos/${encodeURIComponent(filename)}`;
};

// --- Single Polaroid Component ---
const PolaroidFrame: React.FC<{
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  delayOffset: number;
  texture: THREE.Texture | null;
  isLandscape: boolean;
}> = ({ position, rotation, scale, delayOffset, texture, isLandscape }) => {
  // Dimensions: ~ 0.8 x 1.0 units (Aspect ratio ~ 4:5)
  const width = isLandscape ? 1.0 : 0.8;
  const height = isLandscape ? 0.8 : 1.0;
  const thickness = 0.02;
  const borderTop = height * 0.05;
  const borderSide = width * 0.0625;
  const borderBottom = height * 0.25; // Classic thick bottom

  // Inner photo dimensions
  const photoW = width - borderSide * 2;
  const photoH = height - (borderTop + borderBottom);

  // Random slight sway for realism
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Wind sway effect
    const swayX = Math.sin(t * 1.5 + delayOffset) * 0.05;
    const swayZ = Math.cos(t * 1.2 + delayOffset) * 0.05;

    groupRef.current.rotation.x = rotation.x + swayX;
    groupRef.current.rotation.z = rotation.z + swayZ;

    // Add rotation.y from props (facing outwards)
    groupRef.current.rotation.y = rotation.y;
  });

  const photoOffsetY = (borderBottom - borderTop) / 2;
  const photoAspect = photoW / photoH;
  const imageAspect = texture?.image
    ? (texture.image as HTMLImageElement).width /
      (texture.image as HTMLImageElement).height
    : photoAspect;
  if (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (imageAspect > photoAspect) {
      const repeatX = photoAspect / imageAspect;
      texture.repeat.set(repeatX, 1);
      texture.offset.set((1 - repeatX) / 2, 0);
    } else {
      const repeatY = imageAspect / photoAspect;
      texture.repeat.set(1, repeatY);
      texture.offset.set(0, (1 - repeatY) / 2);
    }
  }

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* The Clip/Hook (Visual detail) */}
      <mesh position={[0, height / 2 + 0.05, 0]} castShadow>
        <torusGeometry args={[0.05, 0.01, 8, 16]} />
        <meshStandardMaterial
          color={COLORS.ornamentGold}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* White Paper Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.4} // Matte paper feel
          metalness={0.0}
        />
      </mesh>

      {/* Photo Area (Placeholder for user upload) */}
      <mesh position={[0, photoOffsetY, thickness / 2]}>
        <planeGeometry args={[photoW, photoH]} />
        <meshStandardMaterial color="#000000" roughness={0.8} metalness={0.0} />
      </mesh>

      <mesh position={[0, photoOffsetY, thickness / 2 + 0.002]}>
        <planeGeometry args={[photoW, photoH]} />
        <meshBasicMaterial
          color="#ffffff"
          map={texture ?? undefined}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// --- Manager Component ---
const Polaroids: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const morphProgress = useStore((state) => state.morphProgress);
  const uploadedPhotoUrls = useStore((state) => state.uploadedPhotoUrls);
  const staticPhotoUrls = useMemo(
    () => STATIC_PHOTO_FILES.map(buildPhotoUrl),
    []
  );
  const photoUrls = useMemo(() => {
    if (staticPhotoUrls.length > 0) {
      return staticPhotoUrls;
    }
    if (uploadedPhotoUrls.length > 0) {
      return uploadedPhotoUrls;
    }
    return [];
  }, [staticPhotoUrls, uploadedPhotoUrls]);

  const count = photoUrls.length;

  // Generate Positions
  const items = useMemo(() => {
    if (count === 0) {
      return [];
    }
    const itemsData = [];
    const height = TREE_CONFIG.treeHeight;
    const radius = TREE_CONFIG.treeRadius;
    const chaosR = TREE_CONFIG.chaosRadius;

    // Use Stratified Sampling to ensure even distribution from top to bottom
    // We split the height into equal segments and place one polaroid in each.
    // This guarantees "average frequency" is visually consistent across the whole tree.

    for (let i = 0; i < count; i++) {
      // Vertical Position: Stratified
      // Normalizes i to 0..1 range, adds random jitter within the segment
      const segmentSize = 1.0 / count;
      const yNorm = i * segmentSize + Math.random() * segmentSize * 0.8; // 0.8 to avoid overlap at edges

      // Actual Y coordinate (-height/2 to height/2)
      // yNorm 0 is Bottom, 1 is Top.
      const yPos = yNorm * height - height / 2;

      // Radius at this height (Cone shape)
      // 1.0 at bottom, 0.0 at top
      const rAtY = (1 - yNorm) * radius;

      // Angle: Random
      const theta = Math.random() * Math.PI * 2;

      // Target Position (On surface)
      // Push slightly out (1.1x) so they hang clearly
      const tX = Math.cos(theta) * rAtY * 1.1;
      const tZ = Math.sin(theta) * rAtY * 1.1;

      const tPos = new THREE.Vector3(tX, yPos, tZ);

      // Chaos Position (Random sphere)
      const cPos = getRandomSpherePoint(chaosR);

      // Calculate rotation to face outwards
      const angle = Math.atan2(tX, tZ);
      const rotation = new THREE.Euler(
        (Math.random() - 0.5) * 0.15, // Slight random tilt X
        angle, // Face outward Y
        (Math.random() - 0.5) * 0.15 // Random dangle tilt Z
      );

      itemsData.push({
        id: i,
        cPos,
        tPos,
        rotation,
        // Fixed scale ~0.7 to match Gift Boxes (which are 0.6 size)
        // Polaroid frame is 0.8 x 1.0.
        // 0.8 * 0.7 = 0.56 (Width). 1.0 * 0.7 = 0.7 (Height).
        baseScale: 0.7,
        delayOffset: Math.random() * 10,
        photoUrl: photoUrls[i],
      });
    }

    // Keep image order: bottom -> top
    return itemsData;
  }, [count, photoUrls]);

  // Easing function
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  if (count === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {items.map((item) => (
        <AnimatedPolaroid
          key={item.id}
          item={item}
          morphProgress={morphProgress}
          ease={ease}
        />
      ))}
    </group>
  );
};

// Helper component to handle the morph animation per-item efficiently
const AnimatedPolaroid: React.FC<{
  item: any;
  morphProgress: number;
  ease: (t: number) => number;
}> = ({ item, morphProgress, ease }) => {
  return <MovingGroup item={item} morphProgress={morphProgress} ease={ease} />;
};

const MovingGroup: React.FC<{
  item: any;
  morphProgress: number;
  ease: any;
}> = ({ item, morphProgress, ease }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture(item.photoUrl);
  const isLandscape = useMemo(() => {
    const img = texture?.image as HTMLImageElement | undefined;
    return !!img && img.width > img.height;
  }, [texture]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = ease(morphProgress);

    // Position
    groupRef.current.position.lerpVectors(item.cPos, item.tPos, t);

    // Scale
    // FIXED: Kept constant scale so they don't shrink when scattered
    const s = item.baseScale;
    groupRef.current.scale.setScalar(s);
  });

  return (
    <group ref={groupRef}>
      <PolaroidFrame
        position={new THREE.Vector3(0, 0, 0)} // Local zero
        rotation={item.rotation}
        scale={1}
        delayOffset={item.delayOffset}
        texture={texture}
        isLandscape={isLandscape}
      />
    </group>
  );
};

export default Polaroids;
