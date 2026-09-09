export { proxy } from "../proxy";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/api/super-admin/:path*",
  ],
};
