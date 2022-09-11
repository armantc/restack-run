import server from "@restack-run/server";
import {max} from "@/test";

function test(param: any) {
	return "ali";
}

export const definition = server.get(() => {
	max();

	return "ali";
	console.log("some callback puted here");

	console.log("some code");
});

export default function Dashboard() {
	return <div>Hello from dashboard.</div>;
}

const x = 10;
const y = 12;