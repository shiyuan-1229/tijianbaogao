import { createApiClient } from "@/shared/api/client";
import { publicEnv } from "@/shared/config/env";

export const serverApiClient = createApiClient({
  baseUrl: publicEnv.apiBaseUrl,
});
