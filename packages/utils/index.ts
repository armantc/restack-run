export const isDev = function () {
	return (
		!process.env.NODE_ENV || process.env.NODE_ENV.trim() !== "production"
	);
};