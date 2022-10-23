import server from "@restack-run/server";
import {max} from "@/test";
import path from "path";
import {useEffect} from "react";

function test(param: any) {
	return "ali";
}

export const definition = server.get({
},async () => {

	return {name :"ali 2"};
});

export default function Dashboard() {

	useEffect(()=>{
		definition.fetch().then((val)=>{
			console.log(val);
		})
	},[]);

	return <div>Hello from dashboard.</div>;
}

const x = 10;
const y = 12;