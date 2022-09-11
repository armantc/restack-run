import server from "@restack-run/server";

export const definition = server.get(() => {

	return "ali amad vali nayamade 56";
});

export default function Users() {
	return <div>Hello from users.</div>;
}
