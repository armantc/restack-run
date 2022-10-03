import server from "@restack-run/server";
import {max} from "@/test";
import path from "path";

function test(param: any) {
	return "ali";
}

export const definition = server.get(async () => {

	return {name :"ali 2"};
});

//todo vite restack plugin must regenerate with need props and remove functions on options and any 
// extra vars
export const test2 = server.post({
	onRequest : (req,rep,done) => {
		//
	}
},()=> {
	//
});

export default function Dashboard() {
	return <div>Hello from dashboard.</div>;
}

const x = 10;
const y = 12;