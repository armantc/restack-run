import fastify from "fastify";

export const isDev = function () {
	return (
		!process.env.NODE_ENV || process.env.NODE_ENV.trim() !== "production"
	);
};

// const fastifyInstance = fastify({
// 	logger: isDev() && {
// 		transport: {
// 			target: "pino-pretty",
// 			options: {
// 				translateTime: "SYS:h:MM:ss.l TT",
// 				colorize: true,
// 				ignore: "hostname",
// 			},
// 		},
// 	},
// });

export function get(callback:Function,schema?:string);
export function get(callback:Function){
    console.log("Get Method from server");
}

export function post(){
    console.log("Post Method");
}

//routes is object of all routes with type RestackRoute
export function register(routes,baseApiPath){ //path is base path
	console.log("registered route folan");
}

export function start(port=8080){
	console.log("ReStack server start listening on port " + port);
}

type Route = {
	
}

function route()

export default {get,post,register,start}