import server from "@restack-run/server";

export const getUser = server.get(() => {
	return "ali amad vali nayamade bazam amad 2";
});

export default function User() {
	return <div>Hello from users.</div>;
}
