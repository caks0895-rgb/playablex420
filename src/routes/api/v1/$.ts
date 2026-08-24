import { createFileRoute } from "@tanstack/react-router";
import { corsEmpty, handleV1 } from "@/lib/engine/http.server";

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      OPTIONS: async () => corsEmpty(),
      GET: async ({ params, request }) => handleV1("GET", params._splat ?? "", request),
      POST: async ({ params, request }) => handleV1("POST", params._splat ?? "", request),
    },
  },
});
