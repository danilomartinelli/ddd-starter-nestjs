import { SetMetadata } from "@nestjs/common";

export const FEATURE_FLAG_KEY = "feature_flag";
export const FeatureFlag = (flagName: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(FEATURE_FLAG_KEY, flagName);
