import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CameraControls } from "@react-three/drei";
import { useStore } from "../store";
import { TreeMorphState } from "../types";
import { generateSpiralPath } from "../utils/geometry";
import { TREE_CONFIG, DURATIONS } from "../constants";

const CameraRig: React.FC = () => {
  const controlsRef = useRef<CameraControls>(null);
  const {
    treeState,
    gestureTargetX,
    gestureTargetY,
    isCameraEnabled,
    ribbonProgress,
    setMorphProgress,
    setTreeState,
    setGestureTarget,
    setRibbonProgress,
  } = useStore((state) => state);
  const { camera, gl, pointer } = useThree();

  const rideStartTime = useRef<number | null>(null);
  const fireworkStartTime = useRef<number | null>(null);
  const ribbonFinishTime = useRef<number | null>(null);

  // Camera Ride Path
  const ridePath = useMemo(() => {
    // INCREASED RADIUS: treeRadius + 10.0 (Far away view)
    const p = generateSpiralPath(
      TREE_CONFIG.treeHeight,
      TREE_CONFIG.treeRadius + 10.0,
      5.5
    );
    // Apply Y offset of -2 to every point in the curve
    p.points.forEach((pt) => (pt.y -= 2));
    p.updateArcLengths();
    return p;
  }, []);

  // Mouse Wheel Control
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const state = useStore.getState();
      if (state.isCameraEnabled && state.isHandDetected) return;

      // Disable scroll morph during Cinematic Sequence
      if (
        state.treeState === TreeMorphState.RIDE ||
        state.treeState === TreeMorphState.RIDE_RIBBON ||
        state.treeState === TreeMorphState.RIDE_FIREWORK ||
        state.treeState === TreeMorphState.RIDE_PREPARE
      )
        return;

      const delta = e.deltaY * 0.0015;
      const current = state.morphProgress;
      const next = Math.max(0, Math.min(1, current + delta));

      state.setMorphProgress(next);

      if (next < 0.1 && state.treeState !== TreeMorphState.SCATTERED) {
        state.setTreeState(TreeMorphState.SCATTERED);
      } else if (next > 0.5 && state.treeState === TreeMorphState.SCATTERED) {
        state.setTreeState(TreeMorphState.TREE_SHAPE);
      }
    };

    const domElement = gl.domElement;
    domElement.addEventListener("wheel", handleWheel, { passive: true });
    return () => domElement.removeEventListener("wheel", handleWheel);
  }, [gl]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;

      const state = useStore.getState();
      if (
        state.treeState === TreeMorphState.RIDE ||
        state.treeState === TreeMorphState.RIDE_RIBBON ||
        state.treeState === TreeMorphState.RIDE_FIREWORK ||
        state.treeState === TreeMorphState.RIDE_PREPARE
      )
        return;

      e.preventDefault();
      if (!controlsRef.current) return;

      const rotSpeed = 0.05;
      const moveSpeed = 0.5;

      switch (e.key) {
        case "ArrowLeft":
          controlsRef.current.rotate(-rotSpeed, 0, true);
          break;
        case "ArrowRight":
          controlsRef.current.rotate(rotSpeed, 0, true);
          break;
        case "ArrowUp": {
          const t = new THREE.Vector3();
          const p = new THREE.Vector3();
          controlsRef.current.getTarget(t);
          controlsRef.current.getPosition(p);
          if (t.y < 10) {
            controlsRef.current.setTarget(t.x, t.y + moveSpeed, t.z, true);
            controlsRef.current.setPosition(p.x, p.y + moveSpeed, p.z, true);
          }
          break;
        }
        case "ArrowDown": {
          const t = new THREE.Vector3();
          const p = new THREE.Vector3();
          controlsRef.current.getTarget(t);
          controlsRef.current.getPosition(p);
          if (t.y > -9.0) {
            controlsRef.current.setTarget(t.x, t.y - moveSpeed, t.z, true);
            controlsRef.current.setPosition(p.x, p.y - moveSpeed, p.z, true);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // === STEP 3: APPROACH ===
  useEffect(() => {
    if (treeState === TreeMorphState.RIDE_PREPARE && controlsRef.current) {
      controlsRef.current.enabled = false;

      const startPoint = ridePath.getPointAt(0);
      // Look towards center-ish but also along path
      const tangent = ridePath.getTangentAt(0).normalize();
      const center = new THREE.Vector3(0, startPoint.y, 0);
      const lookTarget = startPoint.clone().add(tangent).lerp(center, 0.3);

      controlsRef.current.setLookAt(
        startPoint.x,
        startPoint.y,
        startPoint.z,
        lookTarget.x,
        lookTarget.y,
        lookTarget.z,
        true
      );

      const timeout = setTimeout(() => {
        setTreeState(TreeMorphState.RIDE);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [treeState, ridePath, setTreeState]);

  // === STEP 5: FINALE POSITIONING ===
  // When entering RIDE_FIREWORK, return camera to Assembly Position (Wide Shot)
  useEffect(() => {
    if (treeState === TreeMorphState.RIDE_FIREWORK && controlsRef.current) {
      controlsRef.current.enabled = false;
      // Move smoothly to the default assembly view
      controlsRef.current.setLookAt(0, 6, 50, 0, 0, 0, true);
    }
  }, [treeState]);

  // Handle Exit Logic
  useEffect(() => {
    if (treeState === TreeMorphState.TREE_SHAPE && controlsRef.current) {
      controlsRef.current.enabled = true;
      rideStartTime.current = null;
      fireworkStartTime.current = null;
      ribbonFinishTime.current = null;
      controlsRef.current.setLookAt(0, 6, 50, 0, 0, 0, true);
    }
  }, [treeState]);

  useFrame((state, delta) => {
    // STEP 1: GROW RIBBON
    if (treeState === TreeMorphState.RIDE_RIBBON) {
      const speed = 0.25; // Slower growth (approx 4s)
      const next = Math.min(1, ribbonProgress + delta * speed);
      setRibbonProgress(next);

      // Ribbon reaches top -> Light the Star
      if (next >= 1) {
        if (ribbonFinishTime.current === null) {
          ribbonFinishTime.current = state.clock.elapsedTime;
        }

        // Wait 1.0s for the "Star Lighting" moment before moving camera
        if (state.clock.elapsedTime - ribbonFinishTime.current > 1.0) {
          ribbonFinishTime.current = null;
          setTreeState(TreeMorphState.RIDE_PREPARE);
        }
      }
      return;
    }

    // STEP 2: CAMERA RIDE
    if (treeState === TreeMorphState.RIDE) {
      if (rideStartTime.current === null)
        rideStartTime.current = state.clock.elapsedTime;

      const elapsed = state.clock.elapsedTime - rideStartTime.current;
      const duration = 90; // Cinematic spiral duration
      let u = Math.min(elapsed / duration, 1.0);

      // 1. Position on Curve
      const pos = ridePath.getPointAt(u);
      camera.position.copy(pos);

      // 2. ANGLED VIEW LOGIC
      const tangent = ridePath.getTangentAt(u).normalize();
      const lookAtTangent = pos.clone().add(tangent);
      const center = new THREE.Vector3(0, pos.y, 0);
      const lookTarget = new THREE.Vector3().lerpVectors(
        lookAtTangent,
        center,
        0.3
      );

      camera.lookAt(lookTarget);

      // 3. Free View Offsets (Mouse)
      const targetYaw = -pointer.x * (Math.PI / 3);
      const targetPitch = pointer.y * (Math.PI / 4);
      camera.rotateY(targetYaw);
      camera.rotateX(targetPitch);

      if (controlsRef.current) controlsRef.current.enabled = false;

      // Arrived at Top -> Transition to Fireworks
      if (u >= 1.0) {
        rideStartTime.current = null;
        setTreeState(TreeMorphState.RIDE_FIREWORK);
      }

      return;
    }

    // STEP 3: FINALE (Ambient Fireworks from Assembly View)
    if (treeState === TreeMorphState.RIDE_FIREWORK) {
      if (fireworkStartTime.current === null)
        fireworkStartTime.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - fireworkStartTime.current;

      // The camera is moving automatically due to the useEffect above.
      // We just wait here for the show to finish.
      // 2.5s travel time + 10s show = 12.5s total

      if (elapsed > 12.5) {
        fireworkStartTime.current = null;
        setTreeState(TreeMorphState.TREE_SHAPE);
      }
      return;
    }

    // PREPARE PHASE (Already handled by useEffect)
    if (treeState === TreeMorphState.RIDE_PREPARE) {
      if (controlsRef.current) controlsRef.current.enabled = false;
      return;
    }

    // === INTERACTIVE MODE ===
    if (controlsRef.current) {
      if (!controlsRef.current.enabled) controlsRef.current.enabled = true;

      const store = useStore.getState();
      if (
        isCameraEnabled &&
        store.isHandDetected &&
        gestureTargetX !== null &&
        gestureTargetY !== null
      ) {
        const targetAzimuth = gestureTargetX * Math.PI;
        const targetPolar = Math.PI / 2 + gestureTargetY * (Math.PI / 6);
        controlsRef.current.rotateTo(targetAzimuth, targetPolar, true);
      }
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={1.4}
      maxPolarAngle={1.85}
      minDistance={15}
      maxDistance={70}
      smoothTime={1.0}
      dollySpeed={0.5}
    />
  );
};

export default CameraRig;
