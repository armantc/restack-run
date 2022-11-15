//no code provided yet
import server from "@restack-run/server";

server.FastifyInstance.addHook("onRequest", async (request, reply) => {
	// Some code
	console.log("From custom hook",request.url);
});

console.log("Server entry imported successfully");