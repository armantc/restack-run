import fastify from "fastify";
import type { RouteOptions, RouteHandlerMethod, HTTPMethods } from "fastify";
import logger from "./logger";

// export const isDev = function () {
// 	return (
// 		!process.env.NODE_ENV || process.env.NODE_ENV.trim() !== "production"
// 	);
// };

// const fastifyInstance = fastify({
// 	logger: isDev() && {
// 		transport: {
// 			target: "pino-pretty",
// 			options: {
// 				translateTime: "SYS:h:MM:ss.l TT",
// 				colorize: true,
// 				ignore: "hostname",
// 			},
// 		},
// 	},
// });

function handleArguments(method: HTTPMethods, args: any[]): RouteOptions {
	let options: Partial<RouteOptions> = {};

	if (args.length === 1) options.handler = args[0];
	else {
		options = args[0];
		options.handler = args[1];
	}

	options.url = options.url || "";
	options.method = method;

	return options as RouteOptions;
}

type RouteShorthandOptions = Omit<RouteOptions, "method" | "handler">;
class Server {
	list: string[] = [];

	route(options: RouteOptions) {
		return options;
	}

	get(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	get(handler: RouteHandlerMethod);
	get(...args) {
		logger.info("get route added");
		return handleArguments("GET", args);
	}

	head(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	head(handler: RouteHandlerMethod);
	head(...args) {
		return handleArguments("HEAD", args);
	}

	post(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	post(handler: RouteHandlerMethod);
	post(...args) {
		return handleArguments("POST", args);
	}

	put(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	put(handler: RouteHandlerMethod);
	put(...args) {
		return handleArguments("PUT", args);
	}

	patch(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	patch(handler: RouteHandlerMethod);
	patch(...args) {
		return handleArguments("PATCH", args);
	}

	delete(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	delete(handler: RouteHandlerMethod);
	delete(...args) {
		return handleArguments("DELETE", args);
	}

	register(routes, baseApiPath) {
		//path is base path
		//console.log("registered route folan");
		this.list.push("registered route " + baseApiPath);
	}

	start(port: 808) {
		logger.info("server start listening on port:" + port);
	}
}

const server = new Server();

export default server;
