import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

type AjvError = {
	message?: string;
	instancePath?: string;
	schemaPath?: string;
	keyword: string;
	params?: {
		missingProperty?: string;
		additionalProperty?: string;
		format?: string;
		limit?: number;
	};
};

type TValidationError = {
	/**
	 * Path to property separated by dot or slash , example : /contact/phone or contact.phone
	 */
	path?: string;
	/**
	 * Keyword is like a code use in client for localization
	 */
	keyword: string;
	/**
	 * Params can use for localization message , for example an object contain max , min , limit
	 */
	params?: any;
	/**
	 * A message send without localization to user , u can use other params with localization on
	 * client side for generate proper message for any language
	 */
	message?: string;
};

export class ValidationError extends Error {
	validation: AjvError[] = [];

	constructor(error: TValidationError);
	constructor(errors: TValidationError[]);
	constructor(...args: any[]) {
		super("Validation Error");

		this.name = this.constructor.name;

		let errors: TValidationError[] = [];
		const arg = args[0];

		if (typeof arg === "object") {
			errors = Array.isArray(arg) ? arg : [arg];
		}

		for (const error of errors) {
			const _e: AjvError = {
				keyword: error.keyword,
			};

			if (error.message) _e.message = error.message;

			if (error.params) _e.params = error.params;

			if (error.path) {
				let instancePath = error.path.replaceAll(".", "/");
				if (!instancePath.startsWith("/"))
					instancePath = "/" + instancePath;
                
                _e.instancePath = instancePath;
			}

			this.validation.push(_e);
		}
	}
}

export default function ErrorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply
) {
	if (error.validation) {
		void reply.status(400).send({
			message: "ValidationError",
			errors: error.validation,
		});
		return;
	}

	void reply.send(error);
}
