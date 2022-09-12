import { useEffect, useState } from 'react'
//import reactLogo from './assets/react.svg';
import {get} from "@restack-run/server";
import Dashboard from '@routes/Dashboard';

//export {Dashboard};

function test(param:any){
	return "ali";
}

// test({
// 	schema : {name : "ali", family : "test"},
// 	callback : ()=> {console.log("hereee")}
// });

export const definition = get(()=>{
	console.log("some callback puted here");
});

const x =10;
const y = 12;

export default function App() {
  const [count, setCount] = useState(0)

  return (
		<div className="App">
			<div>
				<a href="https://vitejs.dev">
					<img src="/vite.svg" className="logo" alt="Vite logo" />
				</a>
				<a href="https://reactjs.org">
					{/* <img
						src={reactLogo}
						className="logo react"
						alt="React logo"
					/> */}
				</a>
			</div>
			<h1>Vite 6 + React 5</h1>
			<Dashboard/>
			<div className="card">
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
  );
}

//export default App
