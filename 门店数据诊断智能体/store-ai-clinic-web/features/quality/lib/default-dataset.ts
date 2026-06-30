import { scanQualityDataset, type QualityDatasetScan } from "@/features/quality/lib/dataset-scanner";

const DEFAULT_QUALITY_DATASET_PATH = "D:\\桌面\\数据\\5人";
const DATASET_CACHE_TTL_MS = 60_000;
const DATASET_CACHE_KEY = "__STORE_AI_CLINIC_QUALITY_DATASET_CACHE__";

type DatasetCacheEntry = {
  datasetPath: string;
  expiresAt: number;
  promise: Promise<QualityDatasetScan | undefined>;
};

type DatasetCacheGlobal = typeof globalThis & {
  __STORE_AI_CLINIC_QUALITY_DATASET_CACHE__?: DatasetCacheEntry;
};

export async function loadDefaultQualityDataset(): Promise<QualityDatasetScan | undefined> {
  const datasetPath = process.env.QUALITY_DATASET_PATH ?? DEFAULT_QUALITY_DATASET_PATH;
  const now = Date.now();
  const cacheRoot = globalThis as DatasetCacheGlobal;
  const cached = cacheRoot[DATASET_CACHE_KEY];

  if (cached && cached.datasetPath === datasetPath && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = scanQualityDataset(datasetPath).catch(() => undefined);
  const nextCache: DatasetCacheEntry = {
    datasetPath,
    expiresAt: Number.POSITIVE_INFINITY,
    promise,
  };
  cacheRoot[DATASET_CACHE_KEY] = nextCache;

  void promise.then(() => {
    if (cacheRoot[DATASET_CACHE_KEY] === nextCache) {
      nextCache.expiresAt = Date.now() + DATASET_CACHE_TTL_MS;
    }
  });

  return promise;
}
