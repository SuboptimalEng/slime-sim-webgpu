import { useEffect } from 'react';
import { main } from './slime-mold/indexV1';

function App() {
  useEffect(() => {
    main();
  }, []);

  // main();

  return (
    <div className="absolute w-full h-full bg-gray-900">
      <div className="flex items-center justify-center h-screen place-items-center text-center text-white">
        <canvas className="h-1/2 w-3/4 border-2"></canvas>
      </div>
    </div>
  );
}

export default App;
