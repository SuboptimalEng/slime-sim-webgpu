import { useEffect } from 'react';
import { main } from './slime-mold/index-05';

function App() {
  useEffect(() => {
    main();
  }, []);

  return (
    <div className="absolute w-full h-full bg-gray-900">
      <div className="flex items-center justify-center h-screen place-items-center text-center text-white">
        <canvas className="w-2/3 aspect-square border-2"></canvas>
      </div>
    </div>
  );
}

export default App;
