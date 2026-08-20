/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handlePosApi } from "./pos-api";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  UPLOADS: R2Bucket;
  FRONTEND_ORIGIN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function imageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function handleUploads(request: Request, env: Env, url: URL) {
  const email = request.headers.get("oai-authenticated-user-email");
  if (url.pathname === "/api/uploads/menu-image" && request.method === "POST") {
    if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) return Response.json({ error: "Image must be smaller than 5 MB." }, { status: 413 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return Response.json({ error: "Image must be smaller than 5 MB." }, { status: 413 });
    const contentType = imageType(bytes);
    if (!contentType) return Response.json({ error: "Only verified JPG, PNG and WebP images are allowed." }, { status: 415 });
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `menu/${crypto.randomUUID()}.${extension}`;
    await env.UPLOADS.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { uploadedBy: email } });
    return Response.json({ key, url: `/api/uploads/${key}` }, { status: 201 });
  }
  if (request.method === "GET" && url.pathname.startsWith("/api/uploads/menu/")) {
    const key = url.pathname.slice("/api/uploads/".length);
    if (!/^menu\/[a-f0-9-]+\.(?:jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
    const object = await env.UPLOADS.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "x-content-type-options": "nosniff", etag: object.httpEtag });
    object.writeHttpMetadata(headers);
    return new Response(object.body, { headers });
  }
  return null;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const uploadResponse = await handleUploads(request, env, url);
    if (uploadResponse) return uploadResponse;

    const apiResponse = await handlePosApi(request, env, url);
    if (apiResponse) return apiResponse;

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;


