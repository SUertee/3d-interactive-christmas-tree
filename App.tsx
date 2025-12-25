import React, { Suspense } from 'react';
import Scene from './components/Scene';
import UI from './components/UI';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-black">
      <UI />
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center text-white/50 tracking-widest text-xs uppercase">
          Loading Experience...
        </div>
      }>
        <Scene />
      </Suspense>
    </div>
  );
};

export default App;