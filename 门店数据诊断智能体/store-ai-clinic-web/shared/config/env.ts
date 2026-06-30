const DEFAULT_APP_NAME = "门店 AI 数据门诊";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export type PublicEnv = {
  appName: string;
  apiBaseUrl: string;
  enableMockConfig: boolean;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export function readPublicEnv(
  source: Record<string, string | undefined> = process.env,
): PublicEnv {
  return {
    appName: source.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME,
    apiBaseUrl:
      source.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    enableMockConfig: parseBoolean(
      source.NEXT_PUBLIC_ENABLE_MOCK_CONFIG,
      true,
    ),
  };
}

export const publicEnv = readPublicEnv();
