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
	apiPrefix : string;
};

type FetchRequestInit = Omit<RequestInit, "body" | "method">;

type FetchOptions = {
	data?: object;
	params?: object;
};

const config = {
	fetch: fetch,
};

function pathJoin(parts, sep = "/") {
	const replace = new RegExp(sep + "{1,}", "g");
	return parts.join(sep).replace(replace, sep);
}

class Fetcher<TResponse> {
	private requestInit: RequestInit = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	constructor(
		routeOptions: RouteOptions,
		fetchOptions: FetchOptions = {},
		validators: object
	) {
		this.then = async function() {
			try {
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

				//todo must add validators

				if (
					fetchOptions.data &&
					typeof fetchOptions.data === "object"
				) {
					if (
						["POST", "PUT", "PATCH"].includes(routeOptions.method)
					) {
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

				const result = await config.fetch.call(
					window,
					url,
					this.requestInit
				);

				return await result.json();
			} catch (e) {
				if(e) //must with error handling
					throw e;
			}
		};
	}

	withOptions(requestInit: FetchRequestInit): Omit<this, "withOptions"> {
		this.requestInit = { ...this.requestInit, ...requestInit };

		delete this.requestInit["body"];
		delete this.requestInit["method"];

		return this;
	}

	// async then(response:TResponse) : Promise<TResponse> {
	// 	return "" as unknown as TResponse
	// }

	then: Promise<TResponse>["then"];
}
class Client<TResponse> {
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
			coerceTypes: true //enable this cause issue when querying mongodb with wrong type,
		});

		addFormats(ajv);

		if (routeOptions.schema) {
			for (const key in routeOptions.schema) {
				this.validators[key + "Validator"] = ajv.compile(
					routeOptions.schema[key]
				);
			}
		}
	}

	fetch(options?: FetchOptions) {
		return new Fetcher<TResponse>(
			this.routeOptions,
			options,
			this.validators
		);
	}
}

function route(routeOptions: RouteOptions) {
	return new Client(routeOptions);
}

export default { route };

type ClientType<T> = Client<T>;

//export type ClientType = InstanceType<typeof Client>;
export type { ClientType };
