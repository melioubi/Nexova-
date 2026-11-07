/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL_INTERNAL ?? "http://127.0.0.1:8000";

const nextConfig = {
	async rewrites() {
		return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
	},
};

export default nextConfig;