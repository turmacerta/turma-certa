import { createApiClient, tokenFromSupabase } from "@turma-certa/api";
import { env } from "./env";
import { getSupabase } from "./supabase";

let onSessionReplaced: (() => void) | undefined;

export function setSessionReplacedHandler(handler: () => void) {
  onSessionReplaced = handler;
}

const client = createApiClient({
  apiUrl: env.apiUrl,
  getAccessToken: tokenFromSupabase(getSupabase()),
  onSessionReplaced: () => onSessionReplaced?.(),
});

export const api = client.api;
export const claimSession = client.claimSession;
export const apiGet = client.get;
export const apiPost = client.post;
export const apiPatch = client.patch;
export const apiPut = client.put;
export const apiDel = client.del;
