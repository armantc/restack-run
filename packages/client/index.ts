/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable import/no-named-as-default-member */
import qs from "qs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

type RouteOptions = {
	url: string;
	method: string;
	params: string[];
	schema?: any;
	apiPrefix: string;
	validation : boolean;
};

type FetchRequestInit = Omit<RequestInit, "body" | "method">;

type RequestDataDefault = unknown;
type RequestParamsDefault = unknown;
type RequestHeadersDefault = unknown;

interface RequestGenericInterface {
	Data?: RequestDataDefault;
	Params?: RequestParamsDefault;
	Headers?: RequestHeadersDefault;
}

type ReplyDefault = unknown;
interface ReplyGenericInterface {
	Reply?: ReplyDefault;
}

interface RouteGenericInterface
	extends RequestGenericInterface,
		ReplyGenericInterface {}

type FetchOptions<T extends RouteGenericInterface> = {
	data?: T["Data"];
	params?: T["Params"];
};

type FetchMethod = (
	input: RequestInfo | URL,
	init?: RequestInit | undefined
) => Promise<Response>;

const config = {
	fetch: async (input: RequestInfo, init?: RequestInit) => {
		const response = await fetch.call(window, input, init);

		const contentType =
			response.headers.get("content-type")?.toLowerCase() ||
			"application/json";

		if (contentType.indexOf("application/json") >= 0) {
			return await response.json();
		} else if (contentType.indexOf("text/") >= 0) {
			return await response.text();
		} else {
			throw new Error(
				"Restack default fetch just support json and text response, please provide custom fetch method."
			);
		}
	},
};

function pathJoin(parts, sep = "/") {
	const replace = new RegExp(sep + "{1,}", "g");
	return parts.join(sep).replace(replace, sep);
}

class ValidationError extends Error {
	constructor(errors : any[]){
		super("ValidationError");
		this.name = this.message;
		this["errors"] = errors;
	}
}

class Fetcher<T extends RouteGenericInterface> {
	fetch = config.fetch;

	private requestInit: RequestInit = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	constructor(
		routeOptions: RouteOptions,
		fetchOptions: FetchOptions<T> = {},
		validators: object
	) {
		//@ts-ignore
		this.then = async function (resolve: Function, reject: Function) {
			if (fetchOptions.data && routeOptions.validation) {
				const isValidData = validators["data"](fetchOptions.data);

				if (!isValidData) {
					const errors = validators["data"].errors;

					const error = new ValidationError(errors);

					if(reject){
						return reject(error); //throw error when use async away
					}else{
						throw error; //throw error when use then catch
					}
				}
			}

			this.requestInit.method = routeOptions.method;

			let url = routeOptions.url;

			if (routeOptions.params.length > 0) {
				url += "/";

				if (!fetchOptions.params)
					throw new Error(
						`Fetching need supply params : ${routeOptions.params.join(
							","
						)}`
					);

				for (const param of routeOptions.params) {
					if (!fetchOptions.params[param]) {
						throw new Error(
							`Fetching need supply param : ${param}`
						);
					}

					url.replace(`/:${param}/`, fetchOptions.params[param]);
				}

				url = url.slice(0, -1); //remove last slash added before
			}

			url = pathJoin([routeOptions.apiPrefix, url]);

			if (fetchOptions.data && typeof fetchOptions.data === "object") {
				if (["POST", "PUT", "PATCH"].includes(routeOptions.method)) {
					if (
						this.requestInit.headers?.["Content-Type"] ===
						"application/json"
					) {
						this.requestInit.body = JSON.stringify(
							fetchOptions.data
						);
					}
				} else {
					//better to node use body in method like GET so we convert data to query string
					url += "?" + qs.stringify(fetchOptions.data);
				}
			}

			try {
				const response = await this.fetch.call(
					window,
					url,
					this.requestInit
				);

				resolve(response);
			} catch (e) {
				if (reject) return reject(e);
				else throw e; //throw error when use then catch
			}
		};
	}

	withOptions(requestInit: FetchRequestInit): this {
		this.requestInit = { ...this.requestInit, ...requestInit };

		delete this.requestInit["body"];
		delete this.requestInit["method"];

		return this;
	}

	withFetch(fetchMethod: FetchMethod) {
		this.fetch = fetchMethod;

		return this;
	}

	then: Promise<T["Reply"]>["then"];
}
class Client<T extends RouteGenericInterface> {
	private routeOptions: RouteOptions;
	private validators = {};

	constructor(routeOptions: RouteOptions) {
		this.routeOptions = routeOptions;

		const ajv = new Ajv({
			allErrors: true,
			//removeAdditional: true,
			useDefaults: true,
			//strict: isDev(),
			$data: true,
			coerceTypes: true, //enable this cause issue when querying mongodb with wrong type,
		});

		addFormats(ajv);

		if (routeOptions.schema) {
			for (const key in routeOptions.schema) {
				this.validators[key] = ajv.compile(routeOptions.schema[key]);
			}
		}
	}

	fetch(options?: FetchOptions<T>) {
		return new Fetcher<T>(this.routeOptions, options, this.validators);
	}
}

class ClientConfig {
	static setFetch(fetchMethod: FetchMethod) {
		config.fetch = fetchMethod;
	}
}

function route(routeOptions: RouteOptions) {
	return new Client(routeOptions);
}

export default { route, ClientConfig };

type ClientType<T extends RouteGenericInterface> = Client<T>;

export type { ClientType };
