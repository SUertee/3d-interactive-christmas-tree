# 3D Interactive Christmas Tree

A premium cinematic 3D web experience featuring a morphing particle Christmas tree, interactive states, rideable camera paths, and GPU-accelerated effects.

## Features

- Real-time 3D scene built with React Three Fiber and Three.js
- Particle-driven tree animations and post-processing effects
- Camera-driven interactivity and immersive motion
- Optional camera access for vision-based interactions

## Tech Stack

- React + Vite
- Three.js, @react-three/fiber, @react-three/drei
- Postprocessing pipeline
- Zustand for state management
- MediaPipe Tasks Vision (optional camera features)

## Getting Started

**Prerequisites:** Node.js (LTS recommended)

1. Install dependencies:
   `npm install`
2. Create `.env.local` and add your Gemini API key:
   `GEMINI_API_KEY=your_key_here`
3. Start the dev server:
   `npm run dev`

## Scripts

- `npm run dev` - Start the local dev server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build

## Notes

- Camera access is optional, but required for vision-based features.
- If running in a new environment, ensure `.env.local` is present in the project root.
