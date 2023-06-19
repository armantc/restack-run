import server from "@restack-run/server";

export const definition = server.get(() => {

	return "ali amad vali nayamade bazam amad 2";
});

export default function Users() {
	return <div>Hello from users.</div>;
}
