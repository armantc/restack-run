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

const config = {
	fetch: fetch,
};

function pathJoin(parts, sep = "/") {
	const replace = new RegExp(sep + "{1,}", "g");
	return parts.join(sep).replace(replace, sep);
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
		this.then = async function (resolve: Function) {
			if (fetchOptions.data) {
				const isValidData = validators["data"](fetchOptions.data);

				if (!isValidData) {
					const errors = validators["data"].errors;
					throw {
						message: "Validation Error",
						errors,
					};
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

			const response = await this.fetch.call(
				window,
				url,
				this.requestInit
			);

			const contentType =
				response.headers.get("content-type")?.toLowerCase() ||
				"application/json";

			if (contentType.indexOf("application/json") >= 0) {
				resolve(await response.json());
			} else if (contentType.indexOf("text/") >= 0) {
				resolve(await response.text());
			} else {
				throw new Error(
					"Restack default fetch just support json and text response, please provide custom fetch method.")
			}
		};
	}

	withOptions(requestInit: FetchRequestInit): this {
		this.requestInit = { ...this.requestInit, ...requestInit };

		delete this.requestInit["body"];
		delete this.requestInit["method"];

		return this;
	}

	withFetch(
		fetchMethod: (
			input: RequestInfo | URL,
			init?: RequestInit | undefined
		) => Promise<Response>
	) {
		this.fetch = fetchMethod;
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

function route(routeOptions: RouteOptions) {
	return new Client(routeOptions);
}

export default { route };

type ClientType<T extends RouteGenericInterface> = Client<T>;

export type { ClientType };
