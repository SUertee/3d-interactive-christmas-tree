import React, { Suspense, useEffect } from "react";
import Scene from "./components/Scene";
import UI from "./components/UI";
import { useStore } from "./store";

const App: React.FC = () => {
  const language = useStore((state) => state.language);
  const isZh = language === "zh";

  useEffect(() => {
    document.title = isZh
      ? "给你的特别礼物，圣诞快乐！"
      : "A Special Gift 4U, Merry Christmas!";
  }, [isZh]);

  return (
    <div className="relative w-full h-full bg-black">
      <UI />
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center text-white/50 tracking-widest text-xs uppercase">
            {isZh ? "体验加载中..." : "Loading Experience..."}
          </div>
        }
      >
        <Scene />
      </Suspense>
    </div>
  );
};

export default App;
