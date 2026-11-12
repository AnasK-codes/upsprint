// Minimal HS256 JWT signer (node:crypto only) compatible with backend jwt.verify(token, JWT_SECRET).
import crypto from "node:crypto";

const b64 = (b) => Buffer.from(b).toString("base64url");

export function signJwt(payload, secret, expiresInSec = 86400) {
  const iat = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ ...payload, iat, exp: iat + expiresInSec }));
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
