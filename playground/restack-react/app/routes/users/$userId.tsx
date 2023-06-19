import server from "@restack-run/server";

export const getUser = server.get(async (req) => {

	return {params:req.params};
});

export default function User() {
	return <div>Hello from users.</div>;
}
