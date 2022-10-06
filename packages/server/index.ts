/* eslint-disable import/no-named-as-default-member */
/* eslint-disable import/no-named-as-default */
import { isDev } from "@restack-run/utils";
import fastify, { FastifyInstance } from "fastify";
import type { RouteOptions, RouteHandlerMethod } from "fastify";
import logger from "./logger";
import fastifyStaticCompressPlugin from "./fastify-static-compress-plugin";
import path from "path";
import qs from "qs";

type RouteShorthandOptions = Pick<
	RouteOptions,
	| "schema"
	| "attachValidation"
	| "bodyLimit"
	| "version"
>;

function handleArguments(args: any[]): RouteOptions {
	let options: Partial<RouteOptions> = {};

	options = args[0];
	options.handler = args[1];

	return options as RouteOptions;
}

class Server {
	private routes: RouteOptions[] = [];
	
	/**
	 * Return fastify instance for advanced configuration
	 */
	fastify : FastifyInstance;

	constructor(){
		this.fastify = fastify({
			logger: logger,
			caseSensitive: false,
			querystringParser: (str) => qs.parse(str), //use incredible qs query string parser
		});
	}

	private route(options: RouteShorthandOptions, handler: RouteHandlerMethod);
	private route(handler: RouteHandlerMethod);
	private route(...args) {
		this.routes.push(handleArguments(args));
	}

	get = this.route;
	head = this.route;
	post = this.route;
	put = this.route;
	patch = this.route;
	delete = this.route;
	options = this.route;

	private async start(port: 8080, apiPrefix, publicPath) {

		if(this.routes.length === 0)
		{
			logger.warn("Can't start server, no route defined");
			return;
		}

		if (!isDev())
			void this.fastify.register(fastifyStaticCompressPlugin, {
				root: publicPath,
				exclude: [apiPrefix], //routes that not contains static like api path must put
				spa: true,
			});

		for(const route of this.routes)
		{
			route.url = path.join(apiPrefix,route.url).replaceAll("\\", "/");
			this.fastify.route(route)
		}

		logger.info(`${this.routes.length} routes successfully registered`);

		try {
			const host = isDev() ? "localhost" : "0.0.0.0";

			await this.fastify.listen({
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
