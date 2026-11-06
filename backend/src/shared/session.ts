type JwtPayload = {
  sub?: string;
  session_id?: string;
  exp?: number;
};

export function jwtPayload(token: string): JwtPayload | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as JwtPayload;
  } catch {
    return null;
  }
}

export function jwtSessionId(token: string) {
  const payload = jwtPayload(token);
  return typeof payload?.session_id === "string" && payload.session_id ? payload.session_id : null;
}

export function isMissingSessionColumn(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("active_session_id") ||
    message.includes("last_login_ip") ||
    message.includes("last_login_at")
  );
}
