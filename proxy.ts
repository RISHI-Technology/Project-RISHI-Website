// Protects the member dashboard: unauthenticated visitors are redirected
// to the /login page (configured in lib/auth.ts).
// Next 16 renamed middleware.ts to proxy.ts and requires a function export,
// so the bare re-export of next-auth/middleware's default is replaced by an
// explicit withAuth() call with the same (default) options.
import { withAuth } from "next-auth/middleware";

export default withAuth({});

export const config = {
  matcher: ["/dashboard/:path*"],
};
