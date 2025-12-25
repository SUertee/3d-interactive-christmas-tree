import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TREE_CONFIG, EXPLOSION_PALETTE } from '../constants';
import { TreeMorphState } from '../types';
import './TreeSystem/Shaders';

interface ActiveWish {
  id: number;
  startTime: number;
  curve: THREE.Curve<THREE.Vector3>;
}

interface Explosion {
  id: number;
  startTime: number;
  position: THREE.Vector3;
  colors: Float32Array; // Pre-calculated colors for particles
  scale: number; // Scale factor for size and velocity
  particleCount: number; // Number of particles for density control
  positions?: Float32Array;
  velocities?: Float32Array;
}

const WishSystem: React.FC = () => {
  const { wishCount, triggerAbsorption, setFlyingWish, treeState } = useStore(state => state);
  const { camera } = useThree();
  
  const [activeWishes, setActiveWishes] = useState<ActiveWish[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const prevWishCount = useRef(wishCount);
  const lastAmbientSpawn = useRef(0);
  const heartSpawned = useRef(false);
  
  // Track when we entered the Firework state to delay the show
  const fireworkStateStartRef = useRef<number>(0);

  // Sync isFlyingWish state for environmental effects (snow, camera)
  useEffect(() => {
    setFlyingWish(activeWishes.length > 0);
  }, [activeWishes.length, setFlyingWish]);
  
  // Update state entry timestamp
  useEffect(() => {
      if (treeState === TreeMorphState.RIDE_FIREWORK) {
          fireworkStateStartRef.current = Date.now();
          heartSpawned.current = false;
      } else {
          fireworkStateStartRef.current = 0;
      }
  }, [treeState]);

  // Detect new wish trigger (User Input)
  useEffect(() => {
    if (wishCount > prevWishCount.current) {
        const id = Date.now() + Math.random();
        
        // --- ARC Path Generation ---
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        fwd.y = 0; 
        fwd.normalize();
        
        const startPos = camera.position.clone().add(fwd.multiplyScalar(15));
        startPos.y = -12;

        const endPos = new THREE.Vector3(0, TREE_CONFIG.treeHeight / 2, 0);

        const mid = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
        mid.y += 8; 

        const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
        mid.add(side.multiplyScalar((Math.random() - 0.5) * 10));

        const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);

        setActiveWishes(prev => [...prev, {
            id,
            startTime: Date.now(),
            curve
        }]);
    }
    prevWishCount.current = wishCount;
  }, [wishCount, camera]);


  // Main Loop
  useFrame(() => {
    const now = Date.now();
    
    // --- AMBIENT FINALE FIREWORKS ---
    if (treeState === TreeMorphState.RIDE_FIREWORK) {
        // Wait 2.5 seconds for Camera to travel to Assembly Position
        const timeInState = now - fireworkStateStartRef.current;
        
        if (timeInState > 9000 && !heartSpawned.current) {
            heartSpawned.current = true;
            const heart = createHeartExplosion(700);
            setExplosions(ex => [...ex, {
                id: now + Math.random(),
                startTime: now,
                position: new THREE.Vector3(0, 8, 0),
                colors: heart.colors,
                scale: 1.0,
                particleCount: heart.particleCount,
                positions: heart.positions,
                velocities: heart.velocities
            }]);
        }

        if (timeInState > 2500) {
            // Spawn more frequently and allow multiple bursts
            if (now - lastAmbientSpawn.current > 300) {
                lastAmbientSpawn.current = now;

                const burstCount = 2 + Math.floor(Math.random() * 2); // 2-3 bursts
                for (let b = 0; b < burstCount; b++) {
                    // Random Position Distant
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 30 + Math.random() * 20; // 30-50 units away
                    const height = (Math.random() - 0.2) * 20; // -4 to +16 height
                    
                    const pos = new THREE.Vector3(
                        Math.cos(angle) * dist,
                        height,
                        Math.sin(angle) * dist
                    );

                    // Create Explosion Data
                    const scale = 1.2; // Big background bursts
                    const pCount = 520;
                    const colors = new Float32Array(pCount * 3);
                    
                    // Random Palette Choice
                    const hex = EXPLOSION_PALETTE[Math.floor(Math.random() * EXPLOSION_PALETTE.length)];
                    const col = new THREE.Color(hex);

                    for(let i=0; i<pCount; i++) {
                        // Add slight variation to the chosen color
                        colors[i*3] = col.r;
                        colors[i*3+1] = col.g;
                        colors[i*3+2] = col.b;
                    }

                    setExplosions(ex => [...ex, {
                        id: now + Math.random(),
                        startTime: now,
                        position: pos,
                        colors: colors,
                        scale: scale,
                        particleCount: pCount
                    }]);
                }
            }
        }
    }

    // --- Active Wishes Logic ---
    let hitType: 'none' | 'normal' | 'special' = 'none';

    setActiveWishes(prev => {
        const next = [];

        for (const w of prev) {
            // Slower flight: 5.5s duration
            const age = (now - w.startTime) / 5500; 
            if (age >= 1.0) {
                const finalPos = w.curve.getPointAt(1);
                
                // --- PROBABILITY & CONFIGURATION ---
                const isMulticolor = Math.random() < 0.2; // 20% chance
                
                const scale = 0.8; 
                const pCount = 400;

                if (isMulticolor) {
                    hitType = 'special';
                } else if (hitType === 'none') {
                    hitType = 'normal';
                }
                
                const colors = new Float32Array(pCount * 3);
                let selectedColor = new THREE.Color();
                
                if (!isMulticolor) {
                    const hex = EXPLOSION_PALETTE[Math.floor(Math.random() * EXPLOSION_PALETTE.length)];
                    selectedColor.set(hex);
                }

                for(let i=0; i<pCount; i++) {
                    if (isMulticolor) {
                        const hex = EXPLOSION_PALETTE[Math.floor(Math.random() * EXPLOSION_PALETTE.length)];
                        selectedColor.set(hex);
                    }
                    colors[i*3] = selectedColor.r;
                    colors[i*3+1] = selectedColor.g;
                    colors[i*3+2] = selectedColor.b;
                }

                setExplosions(ex => [...ex, { 
                    id: w.id, 
                    startTime: now, 
                    position: finalPos,
                    colors: colors,
                    scale: scale,
                    particleCount: pCount
                }]);
                
            } else {
                next.push(w);
            }
        }
        return next;
    });
    
    // Handle absorption trigger
    if (hitType !== 'none') {
        triggerAbsorption(hitType === 'special');
    }
    
    // Clean up Explosions (Duration 2000ms)
    setExplosions(prev => prev.filter(e => (now - e.startTime) < 2000));
  });

  return (
    <group>
        {activeWishes.map(wish => <WishParticle key={wish.id} wish={wish} />)}
        {explosions.map(ex => <ExplosionEffect key={ex.id} explosion={ex} />)}
    </group>
  );
};

// --- Single Wish Projectile ---
const WishParticle: React.FC<{ wish: ActiveWish }> = ({ wish }) => {
    const meshRef = useRef<THREE.Points>(null);
    const trailRef = useRef<THREE.Points>(null);
    
    // Buffer for trail
    const trailLen = 300;
    const trailPositions = useRef<Float32Array>(new Float32Array(trailLen * 3)); 
    const trailIdx = useRef(0);
    
    // Magic Ball Cluster
    const count = 80;
    const { positions, sizes, offsets } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const s = new Float32Array(count);
        const o = new Float32Array(count);
        for(let i=0; i<count; i++) {
            s[i] = Math.random() * 15.0 + 10.0;
            o[i] = Math.random() * 100;
        }
        return { positions: p, sizes: s, offsets: o };
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        
        const now = Date.now();
        const t = Math.min(1, (now - wish.startTime) / 5500);
        
        const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
        
        const pos = wish.curve.getPointAt(ease);
        
        meshRef.current.position.copy(pos);
        // @ts-ignore
        meshRef.current.material.uniforms.uTime.value = now / 1000;

        if (trailRef.current) {
            const tPos = trailPositions.current;
            const idx = trailIdx.current;
            tPos[idx * 3] = pos.x;
            tPos[idx * 3 + 1] = pos.y;
            tPos[idx * 3 + 2] = pos.z;
            
            trailIdx.current = (idx + 1) % trailLen;
            trailRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group>
            <points ref={meshRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
                    <bufferAttribute attach="attributes-aOffset" count={count} array={offsets} itemSize={1} />
                </bufferGeometry>
                {/* @ts-ignore */}
                <wishParticleMaterial 
                    transparent 
                    depthWrite={false} 
                    blending={THREE.AdditiveBlending} 
                    uColorCore={new THREE.Color('#ff1493')} 
                    uColorGlow={new THREE.Color('#ffb74d')}
                />
            </points>

            <points ref={trailRef}>
                 <bufferGeometry>
                    <bufferAttribute 
                        attach="attributes-position" 
                        count={trailLen} 
                        array={trailPositions.current} 
                        itemSize={3} 
                    />
                 </bufferGeometry>
                 <pointsMaterial 
                    size={0.2} 
                    color="#ffd700" 
                    transparent 
                    opacity={0.3} 
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                 />
            </points>
        </group>
    );
};

// --- Explosion Effect ---
const ExplosionEffect: React.FC<{ explosion: Explosion }> = ({ explosion }) => {
    const meshRef = useRef<THREE.Points>(null);
    const count = explosion.particleCount; 
    
    const { positions, velocities } = useMemo(() => {
        if (explosion.positions && explosion.velocities) {
            return { positions: explosion.positions, velocities: explosion.velocities };
        }

        const p = new Float32Array(count * 3);
        const v = new Float32Array(count * 3);
        
        for(let i=0; i<count; i++) {
            p[i*3] = 0; p[i*3+1] = 0; p[i*3+2] = 0;
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Base speed range: 15-25
            const speed = Math.random() * 10 + 15; 
            
            v[i*3] = speed * Math.sin(phi) * Math.cos(theta);
            v[i*3+1] = speed * Math.sin(phi) * Math.sin(theta);
            v[i*3+2] = speed * Math.cos(phi);
        }
        return { positions: p, velocities: v };
    }, [count, explosion.positions, explosion.velocities]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const t = (Date.now() - explosion.startTime) / 1000;
        
        const posAttr = meshRef.current.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        
        const scale = explosion.scale;

        for(let i=0; i<count; i++) {
            const drag = Math.max(0, 1.0 - t * 0.8);
            
            arr[i*3] += (velocities[i*3] * scale) * delta * drag;
            arr[i*3+1] += (velocities[i*3+1] * scale) * delta * drag;
            arr[i*3+2] += (velocities[i*3+2] * scale) * delta * drag;
        }
        posAttr.needsUpdate = true;
        
        const mat = meshRef.current.material as THREE.PointsMaterial;
        mat.opacity = Math.max(0, 1.0 - t * 1.0);
    });

    return (
        <points ref={meshRef} position={explosion.position}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={explosion.colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                vertexColors={true}
                size={0.5 * explosion.scale} 
                transparent 
                blending={THREE.AdditiveBlending} 
                depthWrite={false}
            />
        </points>
    );
};

const createHeartExplosion = (count: number) => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorA = new THREE.Color('#ff4d6d');
    const colorB = new THREE.Color('#ffffff');
    const maxX = 16;
    const maxY = 17;
    const heartScale = 0.25;

    for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const nx = (x / maxX) * heartScale * 16;
        const ny = (y / maxY) * heartScale * 16;
        const nz = (Math.random() - 0.5) * 0.6;

        positions[i * 3] = nx;
        positions[i * 3 + 1] = ny;
        positions[i * 3 + 2] = nz;

        const dir = new THREE.Vector3(nx, ny, nz).normalize();
        const speed = 2.0 + Math.random() * 1.0;
        velocities[i * 3] = dir.x * speed;
        velocities[i * 3 + 1] = dir.y * speed;
        velocities[i * 3 + 2] = dir.z * speed;

        const mix = (Math.sin(t) + 1) / 2;
        const c = colorA.clone().lerp(colorB, mix);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    return { positions, velocities, colors, particleCount: count };
};

export default WishSystem;
