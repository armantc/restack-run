/* eslint-disable import/no-named-as-default */
import { isDev } from "@restack-run/utils";
import fastify from "fastify";
import type { RouteOptions, RouteHandlerMethod } from "fastify";
import logger from "./logger";
import fastifyStaticCompressPlugin from "./fastify-static-compress-plugin";

function handleArguments(args: any[]): RouteOptions {
	let options: Partial<RouteOptions> = {};

	options = args[0];
	options.handler = args[1];

	return options as RouteOptions;
}

type RouteShorthandOptions = Pick<
	RouteOptions,
	| "schema"
	| "attachValidation"
	| "exposeHeadRoute"
	| "bodyLimit"
	| "logLevel"
	| "version"
> & {
	url?: string;
	method?: string;
};

class Server {
	private list: any[] = [];

	private route(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	private route(handler: RouteHandlerMethod);
	private route(...args) {
		this.list.push(handleArguments(args));
	}

	get = this.route;
	head = this.route;
	post = this.route;
	put = this.route;
	patch = this.route;
	delete = this.route;

	private async start(port: 8080, apiPrefix, publicPath) {

		if(this.list.length === 0)
		{
			logger.warn("Cant start server, no route defined");
			return;
		}

		const fastifyInstance = fastify({
			logger: logger,
		});

		if (!isDev())
			void fastifyInstance.register(fastifyStaticCompressPlugin, {
				root: publicPath,
				exclude: [apiPrefix], //routes that not contains static like api path must put
				spa: true,
			});

		try {
			const host = isDev() ? "localhost" : "0.0.0.0";

			await fastifyInstance.listen({
				port,
				host,
			});
		} catch (err) {
			logger.error(err);
			process.exit(1);
		}
	}
}

const server = new Server();

export default server;
