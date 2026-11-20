import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cleanUrl } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/connexion", "/inscription", "/auth"];

/**
 * Rafraîchit la session Supabase à chaque requête et protège les pages privées.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return missingConfigPage();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!isLoggedIn && !isPublic) {
    const target = request.nextUrl.clone();
    target.pathname = "/connexion";
    target.search = "";
    return NextResponse.redirect(target);
  }
  if (isLoggedIn && (path === "/connexion" || path === "/inscription")) {
    const target = request.nextUrl.clone();
    target.pathname = "/tableau-de-bord";
    target.search = "";
    return NextResponse.redirect(target);
  }
  return response;
}

/** Page affichée tant que les variables Supabase ne sont pas configurées (ex. sur Vercel). */
function missingConfigPage() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuration manquante</title>
<style>body{font-family:system-ui,sans-serif;background:#fafaf9;color:#1c1917;margin:0;padding:32px 16px}
main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:16px;padding:24px}
h1{font-size:20px;margin:0 0 8px}code{background:#f5f5f4;padding:2px 6px;border-radius:4px;font-size:13px}
li{margin:6px 0;line-height:1.5}p{line-height:1.5;color:#57534e}</style></head><body><main>
<h1>Il manque la connexion à Supabase</h1>
<p>L'application ne trouve pas ses variables d'environnement. Ajoute-les dans les réglages de ton hébergeur, puis redéploie :</p>
<ul><li><code>NEXT_PUBLIC_SUPABASE_URL</code></li><li><code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code></li><li><code>NEXT_PUBLIC_SITE_URL</code></li></ul>
<p>Sur Vercel : <b>Settings → Environment Variables</b>, puis <b>Deployments → … → Redeploy</b>. En local : remplis le fichier <code>.env.local</code> et relance <code>npm run dev</code>.</p>
</main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
