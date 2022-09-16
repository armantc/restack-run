import { isDev } from '@restack-run/utils';
import fastify from "fastify";
import type { RouteOptions, RouteHandlerMethod, HTTPMethods } from "fastify";
import logger from "./logger";
import fastifyStaticCompressPlugin from "./fastify-static-compress-plugin";

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
		//this.list.push("registered route " + baseApiPath);
		logger.info(routes, baseApiPath);
	}

	async start(port: 8080, apiPrefix, publicPath) {
		const fastifyInstance = fastify({
			logger: {
				transport: {
					target: "pino-pretty",
					options: {
						translateTime: "SYS:h:MM:ss.l TT",
						colorize: true,
						ignore: "hostname",
					},
				},
			},
		});

		void fastifyInstance.register(fastifyStaticCompressPlugin, {
			root: publicPath,
			exclude: [apiPrefix], //routes that not contains static like api path must put
			spa: true,
		});

		try {
			const host = isDev() ? "localhost" : "0.0.0.0";

			await fastifyInstance.listen({
				port: port,
				host,
			});
		} catch (err) {
			logger.error(err);
			process.exit(1);
		}
	}
}

const server = new Server();

//omit to prevent intellisense show start and register, start and register only generated by restack core
export default server as Omit<Server, "start" | "register">;
