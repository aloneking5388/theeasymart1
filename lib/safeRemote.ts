import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList } from "node:net";

export class RemoteFetchError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const blocked4 = new BlockList();
const blocked6 = new BlockList();
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked4.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["::", 128], ["::1", 128], ["::", 96], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8]] as const) blocked6.addSubnet(address, prefix, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family !== 0 && !(family === 4 ? blocked4 : blocked6).check(address, family === 4 ? "ipv4" : "ipv6");
}

export function parsePublicUrl(raw: string): URL {
  if (typeof raw !== "string" || raw.length > 4096 || /[\r\n]/.test(raw)) throw new RemoteFetchError("INVALID_AFFILIATE_URL", "Invalid affiliate URL.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new RemoteFetchError("INVALID_AFFILIATE_URL", "Invalid affiliate URL."); }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (url.port && !["80", "443"].includes(url.port)) ||
      host === "localhost" || /\.(localhost|local|internal|lan|home|test|invalid)$/.test(host) ||
      (!isIP(host) && !host.includes(".")) || (isIP(host) && !isPublicAddress(host))) {
    throw new RemoteFetchError("INVALID_AFFILIATE_URL", "Only public HTTP or HTTPS product URLs are allowed.");
  }
  return url;
}

export async function validatePublicUrl(raw: string) {
  const url = parsePublicUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RemoteFetchError("PRODUCT_FETCH_TIMEOUT", "The request timed out. Please try again.")), 5000); }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new RemoteFetchError("INVALID_AFFILIATE_URL", "This URL points to a private or internal address.");
  }
  return { url, address: addresses.find((address) => address.family === 4) ?? addresses[0] };
}

export interface RemoteOptions { kind: "html" | "image"; timeoutMs?: number; maxBytes?: number; maxRedirects?: number }

// Resolve every hop, then pin the validated address in the socket lookup to prevent DNS rebinding.
export async function safeRemoteFetch(raw: string, options: RemoteOptions): Promise<{ body: Buffer; finalUrl: string; contentType: string }> {
  const timeoutMs = options.timeoutMs ?? 12000;
  const maxBytes = options.maxBytes ?? (options.kind === "html" ? 2 * 1024 * 1024 : 5 * 1024 * 1024);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const deadline = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new RemoteFetchError("PRODUCT_FETCH_TIMEOUT", "The request timed out. Please try again.")), { once: true }));
  const run = async () => {
    let target = raw;
    for (let hop = 0; hop <= (options.maxRedirects ?? 5); hop++) {
      const { url, address } = await validatePublicUrl(target);
      if (controller.signal.aborted) throw new RemoteFetchError("PRODUCT_FETCH_TIMEOUT", "The request timed out. Please try again.");
      const result = await new Promise<{ location?: string; body?: Buffer; contentType?: string }>((resolve, reject) => {
        const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
          signal: controller.signal,
          agent: false,
          headers: { "User-Agent": "EasyMart-ProductMetadata/1.0", Accept: options.kind === "html" ? "text/html,application/xhtml+xml" : "image/*", "Accept-Encoding": "identity" },
          lookup: (_hostname, lookupOptions, callback) => {
            // Node's automatic family selection requests all addresses; still return only the pinned one.
            if ((lookupOptions as { all?: boolean }).all) {
              (callback as unknown as (error: null, addresses: Array<{ address: string; family: number }>) => void)(null, [address]);
            } else callback(null, address.address, address.family);
          },
        }, (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
            const location = res.headers.location;
            res.destroy();
            if (!location) reject(new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "The merchant returned an invalid redirect."));
            else {
              try { resolve({ location: new URL(location, url).toString() }); }
              catch { reject(new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "The merchant returned an invalid redirect.")); }
            }
            return;
          }
          const contentType = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
          const permitted = options.kind === "html" ? ["text/html", "application/xhtml+xml"].includes(contentType) : ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(contentType);
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300 || !permitted || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
            res.destroy(); reject(new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "EasyMart could not retrieve product information from this website.")); return;
          }
          if (Number(res.headers["content-length"]) > maxBytes) { res.destroy(); reject(new RemoteFetchError("PRODUCT_FETCH_TOO_LARGE", "The merchant response is too large.")); return; }
          const chunks: Buffer[] = []; let size = 0;
          res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > maxBytes) { res.destroy(); reject(new RemoteFetchError("PRODUCT_FETCH_TOO_LARGE", "The merchant response is too large.")); } else chunks.push(chunk); });
          res.on("end", () => resolve({ body: Buffer.concat(chunks), contentType }));
          res.on("error", reject);
        });
        req.on("error", reject);
        req.end();
      });
      if (result.location) { target = result.location; continue; }
      return { body: result.body!, contentType: result.contentType!, finalUrl: url.toString() };
    }
    throw new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "The merchant returned too many redirects.");
  };
  try { return await Promise.race([run(), deadline]); }
  catch (error) {
    if (error instanceof RemoteFetchError) throw error;
    const unavailable = new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "EasyMart could not automatically retrieve this product. Please try another product link.");
    unavailable.cause = error;
    throw unavailable;
  } finally { clearTimeout(timer); }
}
