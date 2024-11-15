import { useEffect, useState } from 'react';
import reactLogo from '/react.svg';
import viteLogo from '/vite.svg';
import { main } from './slime-mold/indexV1';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    main();
  }, []);

  // main();

  return (
    <div className="absolute w-full h-full bg-gray-900">
      <div className="flex items-center justify-center h-screen place-items-center text-center text-white">
        <div className="place-items-center text-center text-white">
          <div className="flex">
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <div>Vite + React</div>
          <div>
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
