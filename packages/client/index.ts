export const isDev = function () {
	return (
		!process.env.NODE_ENV || process.env.NODE_ENV.trim() !== "production"
	);
};

export function get(){
    console.log("Get Method from client");
}

export function post(){
    console.log("Post Method");
}

export default {get,post}