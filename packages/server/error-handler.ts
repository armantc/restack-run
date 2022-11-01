import type {FastifyError,FastifyRequest,FastifyReply} from "fastify";

type AjvError = {
	message: string;
	instancePath: string;
	schemaPath: string;
	keyword: string;
	params: {
		missingProperty?: string;
		additionalProperty?: string;
		format?: string;
		limit: number;
	};
};

export class ValidationError {

    message : string;
    errors? : AjvError[];

    constructor(errors : AjvError[])
    {
        this.message = "Validation Error";
        this.errors = errors;
    }
}

export default function ErrorHandler(error : FastifyError,request : FastifyRequest,reply:FastifyReply){

    if(error.validation){
        void reply.status(400).send(new ValidationError(error.validation as unknown as AjvError[]));
        return;
    }

    void reply.send(error);
}