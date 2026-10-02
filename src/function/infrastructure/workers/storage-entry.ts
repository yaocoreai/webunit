import {
  isR2Bucket,
  uploadR2Target,
} from "./r2-storage";
import {
  decodeR2UploadTarget,
  verifyR2UploadTarget,
} from "./r2-upload-signature";
import { parseAllowedOrigins } from "@/function/common/route/origin-policy";

export default {
  async fetch(request: Request, env: Readonly<Record<string, unknown>>) {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (request.method !== "PUT" || new URL(request.url).pathname !== "/upload")
      return response(404, "not_found", cors);
    if (!isR2Bucket(env.STORAGE))
      return response(503, "storage_unavailable", cors);
    if (
      typeof env.STORAGE_UPLOAD_SECRET !== "string" ||
      env.STORAGE_UPLOAD_SECRET.length < 32
    )
      return response(503, "upload_secret_unavailable", cors);
    try {
      const url = new URL(request.url);
      const target = decodeR2UploadTarget(url.searchParams.get("target"));
      if (
        !(await verifyR2UploadTarget(
          target,
          url.searchParams.get("signature") ?? "",
          env.STORAGE_UPLOAD_SECRET,
        ))
      )
        return response(403, "invalid_upload_target", cors);
      if (!request.body) return response(400, "upload_body_required", cors);
      const result = await uploadR2Target(env.STORAGE, target, request.body);
      const headers = new Headers(cors);
      if (result.etag) headers.set("etag", result.etag);
      return new Response(null, { status: 204, headers });
    } catch {
      return response(400, "invalid_upload_request", cors);
    }
  },
};

function corsHeaders(
  origin: string | null,
  env: Readonly<Record<string, unknown>>,
): Headers {
  const allowed = parseAllowedOrigins(env.FUNCTION_ORIGINS);
  return new Headers(
    origin && allowed.includes(origin)
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "PUT,OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-expose-headers": "etag",
          vary: "Origin",
        }
      : undefined,
  );
}
const response = (status: number, error: string, headers: HeadersInit) =>
  Response.json({ error }, { status, headers });
