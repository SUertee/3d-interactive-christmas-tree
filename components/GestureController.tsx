import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { TreeMorphState } from '../types';

const GestureController: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Use atomic selectors
  const isCameraEnabled = useStore(state => state.isCameraEnabled);
  const setMorphProgress = useStore(state => state.setMorphProgress);
  const setGestureTarget = useStore(state => state.setGestureTarget);
  const setTreeState = useStore(state => state.setTreeState);
  const setHandDetected = useStore(state => state.setHandDetected);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const requestRef = useRef<number>(0);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  // --- Stabilization Refs ---
  const openCount = useRef(0);
  const closedCount = useRef(0);
  const stableIsOpen = useRef(true); 
  const prevWrist = useRef<{x: number, y: number, z: number} | null>(null);
  const currentMorphRef = useRef(0); 
  const prevHandDetected = useRef(false);

  // Initialize MediaPipe
  useEffect(() => {
    if (!isCameraEnabled) return;

    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
      
      landmarkerRef.current = landmarker;
      setIsLoaded(true);
      startWebcam();
    };

    initMediaPipe();

    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraEnabled]);

  const startWebcam = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return;

    const startTimeMs = performance.now();
    
    // Detect only if video is playing
    if (videoRef.current.currentTime > 0) {
        const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        let handProcessed = false;

        if (results.landmarks && results.landmarks.length > 0) {
            // Use the first hand detected
            const hand = results.landmarks[0];
            const wrist = hand[0];
            const indexMCP = hand[5];
            const tips = [8, 12, 16, 20];

            // Calculate Scale
            const palmScale = Math.sqrt(
                Math.pow(indexMCP.x - wrist.x, 2) + 
                Math.pow(indexMCP.y - wrist.y, 2) + 
                Math.pow(indexMCP.z - wrist.z, 2)
            );

            // Distance Cutoff
            if (palmScale >= 0.15) {
                handProcessed = true;
                
                if (!prevHandDetected.current) {
                  setHandDetected(true);
                  prevHandDetected.current = true;
                  
                  // SYNC STATE ON RE-ENTRY
                  // Get current global state to avoid jumps
                  const currentGlobalMorph = useStore.getState().morphProgress;
                  currentMorphRef.current = currentGlobalMorph;
                  
                  // Bias stabilization counters to match current state
                  // so it doesn't try to "tween" from the wrong assumption.
                  if (currentGlobalMorph > 0.5) {
                      stableIsOpen.current = false; // Closed
                      closedCount.current = 10;
                      openCount.current = 0;
                  } else {
                      stableIsOpen.current = true; // Open
                      openCount.current = 10;
                      closedCount.current = 0;
                  }
                }

                // --- Open/Closed Logic (Morph) ---
                let avgTipDist = 0;
                tips.forEach(idx => {
                    const tip = hand[idx];
                    const d = Math.sqrt(
                        Math.pow(tip.x - wrist.x, 2) + 
                        Math.pow(tip.y - wrist.y, 2) + 
                        Math.pow(tip.z - wrist.z, 2)
                    );
                    avgTipDist += d;
                });
                avgTipDist /= tips.length;
                const opennessRatio = avgTipDist / (palmScale || 0.01);
                const rawIsOpen = opennessRatio > 1.6;

                // Motion Gating
                let speed = 0;
                if (prevWrist.current) {
                    const dx = wrist.x - prevWrist.current.x;
                    const dy = wrist.y - prevWrist.current.y;
                    const dz = wrist.z - prevWrist.current.z;
                    speed = Math.sqrt(dx*dx + dy*dy + dz*dz);
                }

                if (speed < 0.08) { 
                    if (rawIsOpen) {
                        openCount.current++;
                        closedCount.current = 0;
                    } else {
                        closedCount.current++;
                        openCount.current = 0;
                    }
                    if (openCount.current >= 8) stableIsOpen.current = true;
                    else if (closedCount.current >= 6) stableIsOpen.current = false;
                }

                const targetMorph = stableIsOpen.current ? 0 : 1;
                currentMorphRef.current += (targetMorph - currentMorphRef.current) * 0.08;
                setMorphProgress(currentMorphRef.current);
                setTreeState(currentMorphRef.current > 0.5 ? TreeMorphState.TREE_SHAPE : TreeMorphState.SCATTERED);


                // --- RELATIVE DELTA LOGIC ---
                // Instead of mapping Hand X directly to Angle X (which causes snaps),
                // We add the *change* in Hand X to the current Angle.
                
                if (prevWrist.current) {
                    const dx = wrist.x - prevWrist.current.x;
                    const dy = wrist.y - prevWrist.current.y;
                    
                    // Sensitivity: How fast it spins per hand movement
                    const sensX = 2.5; 
                    const sensY = 2.5;

                    // Read current value from Store (which is kept synced with Camera by CameraRig)
                    const storeState = useStore.getState();
                    const curX = storeState.gestureTargetX || 0;
                    const curY = storeState.gestureTargetY || 0;
                    
                    // Subtract dx to rotate "with" the hand drag
                    const nextX = curX - (dx * sensX); 
                    
                    // Add dy for tilt (Up is negative in screen space usually, check directions)
                    let nextY = curY + (dy * sensY);
                    
                    // Soft Clamp Pitch to avoid flipping but allow full range
                    nextY = Math.max(-1, Math.min(1, nextY));
                    
                    setGestureTarget(nextX, nextY);
                }
                
                prevWrist.current = { ...wrist };
            }
        } 
        
        if (!handProcessed) {
            // Hand Lost logic
            if (prevHandDetected.current) {
              setHandDetected(false);
              prevHandDetected.current = false;
            }
            // Reset velocity tracking so we don't jump when hand returns
            prevWrist.current = null;
        }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div 
        id="webcam-container" 
        style={{ display: isCameraEnabled && isLoaded ? 'block' : 'none' }}
    >
        <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};

export default GestureController;