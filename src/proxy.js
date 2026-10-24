import { proxy as dashboardProxy, isAuthenticated } from "./dashboardGuard";
import {
  sessionFromRequest,
  isAccountProxyPath,
  isMimoTakeoverPath,
  takeoverUpstreamPath,
  proxyAccountRequest,
  runTakeover,
  attachSessionCookie,
  originOf,
} from "./lib/mimoLoginSession";

export default async function proxy(request) {
  const cookies = request.headers.get("cookie") || "";
  const hasSessionCookie = cookies.includes("9r_mimo_login=");
  const { pathname } = request.nextUrl;
  if (hasSessionCookie && !(await isAuthenticated(request))) {
    const res = await dashboardProxy(request);
    const headers = new Headers(res.headers);
    headers.append("Set-Cookie", "9r_mimo_login=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  if (!hasSessionCookie && /^\/(fe\/|pass)/.test(pathname) && !pathname.startsWith("/_next")) {
    console.log(`${new Date().toISOString().slice(11,23)} [mimo-login] no-session ${pathname} (cookie header: ${cookies ? cookies.slice(0, 80) : "<none>"})`);
  }
  if (hasSessionCookie) {
    const sess = sessionFromRequest(request);
    if (sess) {
      const origin = originOf(request);
      try {
        if (isMimoTakeoverPath(pathname)) {
          const upstreamUrl = `${sess.upstreamBase}${takeoverUpstreamPath(pathname)}${request.nextUrl.search || ""}`;
          return attachSessionCookie(await runTakeover(sess, upstreamUrl, origin), sess);
        }
        if (isAccountProxyPath(pathname)) {
          return attachSessionCookie(await proxyAccountRequest(sess, request, origin), sess);
        }
      } catch (e) {
        console.log(`${new Date().toISOString().slice(11,23)} [mimo-login] proxy error:`, e?.message || e);
        return new Response("mimo login proxy error", { status: 502 });
      }
    } else {
      console.log(`${new Date().toISOString().slice(11,23)} [mimo-login] session cookie undecodable — falling through (${pathname})`);
    }
  }

  if (hasSessionCookie) {
    const res = await dashboardProxy(request);
    const headers = new Headers(res.headers);
    headers.append("Set-Cookie", "9r_mimo_login=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  return dashboardProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
