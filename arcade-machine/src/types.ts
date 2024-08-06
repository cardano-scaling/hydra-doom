import { Assets, Unit } from "lucid-cardano";

// Hydra API types
export type UTxOResponse = {
  [txIn: string]: {
    address: string;
    datum: string | null;
    inlineDatum: any;
    inlineDatumhash: string | null;
    refereceScript: any | null;
    value: Record<string, number>;
  };
};

// Conversions
export const recordValueToAssets = (value: Record<string, number>): Assets =>
  Object.entries(value).reduce(
    (acc, pair) => {
      const [key, value] = pair;
      acc[key] = BigInt(value);
      return acc;
    },
    {} as Record<Unit, bigint>,
  );
