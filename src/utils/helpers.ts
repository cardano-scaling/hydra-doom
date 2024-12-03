export const fromHex = (string: string) => Buffer.from(string, "hex");
export const toHex = (bytes: Buffer | Uint8Array) =>
  Buffer.from(bytes).toString("hex");
