import { useEffect, useState } from 'react';
import { main, cleanUp } from './slime-mold/main';

function App() {
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const runMainAsync = async () => {
      try {
        await main();
      } catch (e: any) {
        setErrorMessage(String(e));
        cleanUp();
      }
    };

    runMainAsync();

    return () => {
      // We need to cancel request animation frame in the old main fn
      // when refreshing the page to avoid getting WebGPU errors.
      cleanUp();
    };
  }, []);

  return (
    <div className="absolute w-full h-full bg-black">
      {errorMessage.length > 0 && (
        <div className="text-4xl text-red-500 p-8">{errorMessage}</div>
      )}
      <div className="flex items-center justify-center h-screen place-items-center text-center text-white">
        <canvas></canvas>
      </div>
    </div>
  );
}

export default App;
