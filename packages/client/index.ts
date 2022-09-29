export const isDev = function () {
	return (
		!process.env.NODE_ENV || process.env.NODE_ENV.trim() !== "production"
	);
};

function route(options){
	console.log("route called with opts", options);
}

export default {route}