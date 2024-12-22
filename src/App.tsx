import { useEffect } from 'react';
import { cleanUp, main } from './slime-mold';

function App() {
  useEffect(() => {
    main();
    return () => {
      // we need to cancel request animation frame in the old main fn
      // when refreshing the page to avoid getting WebGPU errors
      cleanUp();
    };
  }, []);

  return (
    <div className="absolute w-full h-full bg-black">
      <div className="flex items-center justify-center h-screen place-items-center text-center text-white">
        <canvas></canvas>
      </div>
    </div>
  );
}

export default App;
