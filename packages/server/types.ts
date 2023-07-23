import type {
	RouteOptions,
	RawServerBase,
	RawServerDefault,
	RawRequestDefaultExpression,
	RawReplyDefaultExpression,
	ContextConfigDefault,
	FastifyTypeProvider,
	FastifyTypeProviderDefault,
	FastifyLoggerInstance,
	FastifyReply,
    FastifyInstance,
    FastifyContext
} from "fastify";

import type { ClientType } from "@restack-run/client";

export {RouteOptions};

type RestackSchema = {
	data?: unknown;
	params?: unknown;
	response?: unknown;
	headers?: unknown;
};

export type RouteShorthandOptions = Pick<
	RouteOptions,
	"attachValidation" | "bodyLimit" | "version"
> & {
	schema?: RestackSchema;
};

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

type CallTypeProvider<F extends FastifyTypeProvider, I> = (F & {
	input: I;
})["output"];

type ResolveReplyFromSchemaCompiler<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema
> = {
	[K in keyof SchemaCompiler["response"]]: CallTypeProvider<
		TypeProvider,
		SchemaCompiler["response"][K]
	>;
} extends infer Result
	? Result[keyof Result]
	: unknown;

type KeysOf<T> = T extends any ? keyof T : never;

type UndefinedToUnknown<T> = [T] extends [undefined] ? unknown : T;

type ResolveFastifyReplyType<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> = UndefinedToUnknown<
	KeysOf<RouteGeneric["Reply"]> extends never
		? ResolveReplyFromSchemaCompiler<TypeProvider, SchemaCompiler>
		: RouteGeneric["Reply"]
>;

export type ResolveFastifyReplyReturnType<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> = ResolveFastifyReplyType<
	TypeProvider,
	SchemaCompiler,
	RouteGeneric
> extends infer Return
	? Return | void | Promise<Return | void>
	: unknown;

type ResolveRequestParams<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> = UndefinedToUnknown<
	KeysOf<RouteGeneric["Params"]> extends never
		? CallTypeProvider<TypeProvider, SchemaCompiler["params"]>
		: RouteGeneric["Params"]
>;

type ResolveRequestHeaders<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> = UndefinedToUnknown<
	KeysOf<RouteGeneric["Headers"]> extends never
		? CallTypeProvider<TypeProvider, SchemaCompiler["headers"]>
		: RouteGeneric["Headers"]
>;

interface FastifySchema {
	data?: unknown;
	params?: unknown;
	headers?: unknown;
	response?: unknown;
}

type ResolveRequestData<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> = UndefinedToUnknown<
	KeysOf<RouteGeneric["Data"]> extends never
		? CallTypeProvider<TypeProvider, SchemaCompiler["data"]>
		: RouteGeneric["Data"]
>;

interface ResolveFastifyRequestType<
	TypeProvider extends FastifyTypeProvider,
	SchemaCompiler extends FastifySchema,
	RouteGeneric extends RouteGenericInterface
> extends FastifyRequestType {
	params: ResolveRequestParams<TypeProvider, SchemaCompiler, RouteGeneric>;
	headers: ResolveRequestHeaders<TypeProvider, SchemaCompiler, RouteGeneric>;
	data: ResolveRequestData<TypeProvider, SchemaCompiler, RouteGeneric>;
}

interface FastifyRequestType<
	Params = unknown,
	Data = unknown,
	Headers = unknown
> {
	params: Params;
	headers: Headers;
	data: Data;
}

interface FastifyRequest<
	RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
	RawServer extends RawServerBase = RawServerDefault,
	RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
	SchemaCompiler extends FastifySchema = FastifySchema,
	TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
	ContextConfig = ContextConfigDefault,
	Logger extends FastifyLoggerInstance = FastifyLoggerInstance,
	RequestType extends FastifyRequestType = ResolveFastifyRequestType<
		TypeProvider,
		SchemaCompiler,
		RouteGeneric
	>
	// ^ Temporary Note: RequestType has been re-ordered to be the last argument in
	//   generic list. This generic argument is now considered optional as it can be
	//   automatically inferred from the SchemaCompiler, RouteGeneric and TypeProvider
	//   arguments. Implementations that already pass this argument can either omit
	//   the RequestType (preferred) or swap Logger and RequestType arguments when
	//   creating custom types of FastifyRequest. Related issue #4123
> {
	id: any;
	params: RequestType["params"]; // deferred inference
	raw: RawRequest;
	data: RequestType["data"];
	headers: RawRequest["headers"] & RequestType["headers"]; // this enables the developer to extend the existing http(s|2) headers list
	log: Logger;
	server: FastifyInstance;
	context: FastifyContext<ContextConfig>;

	/** in order for this to be used the user should ensure they have set the attachValidation option. */
	validationError?: Error & { validation: any; validationContext: string };

	/**
	 * @deprecated Use `raw` property
	 */
	readonly req: RawRequest & RouteGeneric["Headers"]; // this enables the developer to extend the existing http(s|2) headers list
	readonly ip: string;
	readonly ips?: string[];
	readonly hostname: string;
	readonly url: string;
	readonly protocol: "http" | "https";
	readonly method: string;
	readonly routerPath: string;
	readonly routerMethod: string;
	readonly is404: boolean;
	readonly socket: RawRequest["socket"];

	// Prefer `socket` over deprecated `connection` property in node 13.0.0 or higher
	// @deprecated
	readonly connection: RawRequest["socket"];
}

type RouteHandlerMethod<
	RawServer extends RawServerBase = RawServerDefault,
	RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
	RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
	RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
	ContextConfig = ContextConfigDefault,
	SchemaCompiler extends FastifySchema = FastifySchema,
	TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
	Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = (
	this: FastifyInstance<
		RawServer,
		RawRequest,
		RawReply,
		Logger,
		TypeProvider
	>,
	request: FastifyRequest<
		RouteGeneric,
		RawServer,
		RawRequest,
		SchemaCompiler,
		TypeProvider,
		ContextConfig,
		Logger
	>,
	reply: FastifyReply<
		RawServer,
		RawRequest,
		RawReply,
		RouteGeneric,
		ContextConfig,
		SchemaCompiler,
		TypeProvider
	>
	// This return type used to be a generic type argument. Due to TypeScript's inference of return types, this rendered returns unchecked.
) => ResolveFastifyReplyReturnType<TypeProvider, SchemaCompiler, RouteGeneric>;

type RouteShorthandHandlerMethod<T extends RouteGenericInterface> =
	RouteHandlerMethod<
		RawServerDefault,
		RawRequestDefaultExpression<RawServerDefault>,
		RawReplyDefaultExpression<RawServerDefault>,
		T,
		ContextConfigDefault,
		FastifySchema,
		FastifyTypeProviderDefault,
		FastifyLoggerInstance
	>;

interface Route {
	<T extends RouteGenericInterface>(
		options: RouteShorthandOptions,
		handler: RouteShorthandHandlerMethod<T>
	): ClientType<T>;
	<T extends RouteGenericInterface>(
		handler: RouteShorthandHandlerMethod<T>
	): ClientType<T>;
}
export interface Server {
	get: Route;
	head: Route;
	post: Route;
	put: Route;
	patch: Route;
	delete: Route;
	options: Route;
	FastifyInstance : FastifyInstance
}