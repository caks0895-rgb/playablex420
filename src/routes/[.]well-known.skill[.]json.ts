import { createFileRoute } from "@tanstack/react-router";
import { discoveryJson, discoveryOptions } from "@/lib/engine/discovery";

export const Route = createFileRoute("/.well-known/skill.json")({
  server: {
    handlers: {
      OPTIONS: async () => discoveryOptions(),
      GET: async ({ request }) => discoveryJson(request, "skill"),
    },
  },
});
