import { create } from 'zustand';
import { TreeMorphState } from './types';

interface AppState {
  treeState: TreeMorphState;
  morphProgress: number; // 0 to 1
  ribbonProgress: number; // 0 to 1
  starProgress: number; // 0 to 1
  
  // Camera / Gesture State
  isCameraEnabled: boolean;
  isHandDetected: boolean;
  gestureTargetX: number | null; // -1 to 1 (yaw control)
  gestureTargetY: number | null; // -1 to 1 (pitch control)

  // Wish System
  wishCount: number; // Increment to trigger new wish
  lastAbsorptionTime: number; // Timestamp when tree absorbed energy
  isLastAbsorptionSpecial: boolean; // Tracks if the last wish was a special multicolor one
  isFlyingWish: boolean; // State to track if a wish is currently in flight
  uploadedPhotoUrls: string[];

  // UI Language
  language: 'zh' | 'en';

  // Actions
  setTreeState: (state: TreeMorphState) => void;
  setMorphProgress: (progress: number) => void;
  setRibbonProgress: (progress: number) => void;
  setStarProgress: (progress: number) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setHandDetected: (detected: boolean) => void;
  setGestureTarget: (x: number | null, y: number | null) => void;
  setFlyingWish: (isFlying: boolean) => void;
  setUploadedPhotoUrls: (urls: string[]) => void;
  toggleLanguage: () => void;
  
  triggerWish: () => void;
  triggerAbsorption: (isSpecial?: boolean) => void;

  resetExperience: () => void;
  assembleTree: () => void;
  startRide: () => void;
  exitRide: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  treeState: TreeMorphState.SCATTERED,
  morphProgress: 0,
  ribbonProgress: 0,
  starProgress: 0,

  isCameraEnabled: false,
  isHandDetected: false,
  gestureTargetX: null,
  gestureTargetY: null,

  wishCount: 0,
  lastAbsorptionTime: 0,
  isLastAbsorptionSpecial: false,
  isFlyingWish: false,
  uploadedPhotoUrls: [],
  language: 'en',

  setTreeState: (state) => set({ treeState: state }),
  setMorphProgress: (progress) => set({ morphProgress: progress }),
  setRibbonProgress: (progress) => set({ ribbonProgress: progress }),
  setStarProgress: (progress) => set({ starProgress: progress }),
  setCameraEnabled: (enabled) => set({ isCameraEnabled: enabled }),
  setHandDetected: (detected) => set({ isHandDetected: detected }),
  setGestureTarget: (x, y) => set({ gestureTargetX: x, gestureTargetY: y }),
  setFlyingWish: (isFlying) => set({ isFlyingWish: isFlying }),
  setUploadedPhotoUrls: (urls) => set({ uploadedPhotoUrls: urls }),
  toggleLanguage: () =>
    set((state) => ({ language: state.language === 'zh' ? 'en' : 'zh' })),

  triggerWish: () => set((state) => ({ wishCount: state.wishCount + 1 })),
  triggerAbsorption: (isSpecial = false) => set({ 
    lastAbsorptionTime: Date.now() / 1000,
    isLastAbsorptionSpecial: isSpecial
  }),

  resetExperience: () => set({
    treeState: TreeMorphState.SCATTERED,
    morphProgress: 0,
    ribbonProgress: 0,
    starProgress: 0,
    gestureTargetX: null,
    gestureTargetY: null,
    isHandDetected: false,
    isFlyingWish: false,
    isLastAbsorptionSpecial: false
  }),

  assembleTree: () => {
    const { treeState } = get();
    if (treeState !== TreeMorphState.SCATTERED) return;
    set({ treeState: TreeMorphState.MORPHING });
  },

  startRide: () => {
    const { treeState, morphProgress } = get();
    if (treeState !== TreeMorphState.TREE_SHAPE && morphProgress < 0.8) return;
    
    set({ 
      treeState: TreeMorphState.RIDE_RIBBON,
      ribbonProgress: 0,
      isCameraEnabled: false,
      isHandDetected: false,
      gestureTargetX: null,
      gestureTargetY: null
    });
  },

  exitRide: () => {
    set({
      treeState: TreeMorphState.TREE_SHAPE,
      ribbonProgress: 0 // Reset ribbon so it disappears
    });
  }
}));
