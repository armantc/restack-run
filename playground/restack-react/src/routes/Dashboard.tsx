import server,{ValidationError} from "@restack-run/server";
import {max} from "@/test";
import path from "path";
import {useEffect} from "react";
import { Static, Type } from "@sinclair/typebox";

const UserSchema = Type.Object({
	name : Type.String({maxLength : 2}),
	address : Type.Optional(Type.String())
});

type User = Static<typeof UserSchema>;

export const getUsers = server.get<{Data : User}>({
	schema : {
		data : UserSchema
	}
},async function(request,reply)  {
	return request.data;
});

export default function Dashboard() {

	const test = async function() {
		try {
		const result = await getUsers.fetch({
			data : {
				name : "ali"
			}
		});
		console.log(result);
	}catch(e){
		console.log(e.errors);
	}
	}

	useEffect(()=>{

		test(); 

		// void getUsers.fetch({
		// 	data : {
		// 		name: "ali"
		// 	}
		// }).then((val)=>{
		// 	//
		// 	console.log("hereee",val);
		// }).catch((reason)=> console.log(JSON.stringify(reason)));
	},[]);

	return <div>Hello from dashboard.</div>;
}