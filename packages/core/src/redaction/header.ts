/**
 * Minimal structural type for an HTTP header as delivered by browser APIs.
 * Deliberately loose on `binaryValue` (Chromium says number[], WXT types say
 * ArrayBuffer) — WebTrace never reads binary headers, it only redacts them.
 */
export interface HttpHeader {
  name: string;
  value?: string;
  binaryValue?: number[] | ArrayBuffer;
}
