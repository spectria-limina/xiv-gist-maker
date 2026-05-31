import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { type TokenData } from "./github-oauth";

export type { TokenData };

const COOKIE_NAME = "gh_token";
const ALGORITHM = "aes-256-gcm";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 6 months, matching GitHub App refresh token lifetime

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    );
  }
  return Buffer.from(hex, "hex");
}

async function encryptData(data: TokenData): Promise<string> {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

async function decryptData(value: string): Promise<TokenData | null> {
  try {
    const key = getKey();
    const [ivB64, tagB64, encB64] = value.split(".");
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const json = Buffer.concat([
      decipher.update(Buffer.from(encB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const data = JSON.parse(json);
    if (typeof data?.accessToken !== "string") return null;
    return data as TokenData;
  } catch {
    return null;
  }
}

export async function getTokenData(): Promise<TokenData | null> {
  const jar = await cookies();
  const val = jar.get(COOKIE_NAME)?.value;
  if (!val) return null;
  return decryptData(val);
}

export async function setTokenCookie(data: TokenData): Promise<void> {
  const encrypted = await encryptData(data);
  const jar = await cookies();
  jar.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearTokenCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
