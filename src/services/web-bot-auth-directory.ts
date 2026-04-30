import { directoryResponseHeaders } from "web-bot-auth";
import { signerFromJWK } from "web-bot-auth/crypto";
import type { Env } from "../types";

/** Media type required by draft-meunier-http-message-signatures-directory / Cloudflare Web Bot Auth. */
export const HTTP_MESSAGE_SIGNATURES_DIRECTORY_MEDIA_TYPE = "application/http-message-signatures-directory+json";

/**
 * RFC 9421 Appendix B.1.4 Ed25519 test keypair (same as web-bot-auth examples).
 * Override with `WEB_BOT_AUTH_ED25519_PRIVATE_JWK` (JSON JWK with `d` and `x`) for a unique bot identity.
 */
const DEFAULT_ED25519_JWK: JsonWebKey = {
  kty: "OKP",
  crv: "Ed25519",
  d: "n4Ni-HpISpVObnQMW0wOhCKROaIKqKtW_2ZYb2p9KcU",
  x: "JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs"
};

function resolveEd25519SigningJwk(env: Env): JsonWebKey {
  const raw = env.WEB_BOT_AUTH_ED25519_PRIVATE_JWK?.trim();
  if (!raw) return DEFAULT_ED25519_JWK;
  try {
    const jwk = JSON.parse(raw) as JsonWebKey;
    if (jwk.kty === "OKP" && jwk.crv === "Ed25519" && typeof jwk.d === "string" && typeof jwk.x === "string") {
      return jwk;
    }
  } catch {
    // ignore invalid JSON
  }
  return DEFAULT_ED25519_JWK;
}

function directoryJsonBody(publicX: string): string {
  return JSON.stringify({
    keys: [{ kty: "OKP", crv: "Ed25519", x: publicX }]
  });
}

/**
 * Signed JWKS directory for Web Bot Auth (GET/HEAD).
 * @see https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/
 */
export async function serveHttpMessageSignaturesDirectory(env: Env, incoming: Request): Promise<Response> {
  const jwk = resolveEd25519SigningJwk(env);
  const body = directoryJsonBody(String(jwk.x));
  const responseHeaders = new Headers({
    "content-type": HTTP_MESSAGE_SIGNATURES_DIRECTORY_MEDIA_TYPE,
    "cache-control": "public, max-age=300"
  });
  const responseLike = { status: 200, headers: responseHeaders };
  const signer = await signerFromJWK(jwk);
  const created = new Date();
  const expires = new Date(created.getTime() + 600_000);
  const sig = await directoryResponseHeaders({ request: incoming, response: responseLike }, [signer], {
    created,
    expires
  });
  const out = new Headers(responseHeaders);
  out.set("Signature", sig.Signature);
  out.set("Signature-Input", sig["Signature-Input"]);

  if (incoming.method === "HEAD") {
    return new Response(null, { status: 200, headers: out });
  }
  return new Response(body, { status: 200, headers: out });
}

/** For outbound bot `fetch()` calls: set `Signature-Agent` to your HTTPS directory URL, then use these helpers. */
export { REQUEST_COMPONENTS, SIGNATURE_AGENT_HEADER, signatureHeaders } from "web-bot-auth";
export { signerFromJWK } from "web-bot-auth/crypto";
