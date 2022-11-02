/* eslint-disable import/no-named-as-default-member */
/* eslint-disable import/no-named-as-default */
import { isDev } from "@restack-run/utils";
import fastify, { FastifyInstance } from "fastify";
import logger from "./logger";
import fastifyStaticCompressPlugin from "./fastify-static-compress-plugin";
import path from "path";
import qs from "qs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type {Server, RouteOptions, RouteShorthandOptions} from "./types";
import ErrorHandler,{ValidationError} from "./error-handler";

function handleArguments(args: any[]): RouteOptions {
	let options: Partial<RouteOptions> = {};

	options = args[0];
	options.handler = args[1];

	return options as RouteOptions;
}

class _Server {
	private routes: RouteOptions[] = [];

	/**
	 * Return fastify instance for advanced configuration
	 */
	fastify: FastifyInstance;

	constructor() {
		this.fastify = fastify({
			logger: logger,
			caseSensitive: false,
			querystringParser: (str) => qs.parse(str), //use incredible qs query string parser
		});

		const ajv = new Ajv({
			allErrors: false,
			removeAdditional: true,
			useDefaults: true,
			//strict: isDev(),
			coerceTypes: true, //this force convert , for example if type is number and pass string convert it to number auto
		});

		addFormats(ajv);

		this.fastify.setValidatorCompiler(({ schema }) => {
			return ajv.compile(schema);
		});

		this.fastify.setErrorHandler(ErrorHandler);
	}

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
		if (this.routes.length === 0) {
			logger.warn("Can't start server, no route defined");
			return;
		}

		if (!isDev())
			void this.fastify.register(fastifyStaticCompressPlugin, {
				root: publicPath,
				exclude: [apiPrefix], //routes that not contains static like api path must put
				spa: true,
			});

		for (const route of this.routes) {
			route.url = path.join(apiPrefix, route.url).replaceAll("\\", "/");

			const shOptionsSchema = (route as RouteShorthandOptions).schema;

			if (shOptionsSchema) {
				const schema = {};

				if (shOptionsSchema.response)
					schema["response"] = shOptionsSchema.response;
				if (shOptionsSchema.headers)
					schema["headers"] = shOptionsSchema.headers;

				if (shOptionsSchema.data) {
					if (
						["PUT", "POST", "PATCH"].includes(
							route.method as string
						)
					)
						schema["body"] = shOptionsSchema.data;
					else schema["querystring"] = shOptionsSchema.data;
				}

				route.schema = schema;
			}

			this.fastify.route(route);
		}

		this.fastify.addHook("preHandler", (request, reply, done) => {
			if (request.body) request["data"] = request.body;
			else if (request.query) request["data"] = request.query;
			done();
		});

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

const server = new _Server();

export {ValidationError};

export default server as unknown as Server;
