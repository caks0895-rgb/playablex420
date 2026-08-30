/**
 * Always serve agent discovery JSON, even if the TanStack file route misses
 * on a Vercel/Nitro deploy. Agents look at /skill.json and /.well-known/skill.json.
 */
import {
  discoveryJson,
  discoveryOptions,
  isDiscoveryPath,
} from "../../src/lib/engine/discovery";

interface DiscoveryEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default async function skillJsonMiddleware(
  event: DiscoveryEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const kind = isDiscoveryPath(event.url.pathname);
  if (!kind) return next();

  const method = (event.req.method ?? "GET").toUpperCase();
  if (method === "OPTIONS") return discoveryOptions();
  if (method !== "GET") return next();

  const url = event.url instanceof URL ? event.url : new URL(String(event.url));
  return discoveryJson(new Request(url.toString()), kind);
}
