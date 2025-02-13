import { fromIndicies } from "./alphabet.js";
import { sortkey } from "./sortkey.js";

/**
 * Calculates a key optimized for items that have an intrinsic chronological
 * order.
 *
 * Items in the list may have an intrinsic chronological that is applied
 * by default when new items are added. This is the worst-case scenario
 * for sortkeys, because adding new items to the same position causes
 * the sortkey to grow at the rate of one character every six insertions.
 *
 * To avoid this, chronokey prefixes sortkey with an encoded timestamp (e.g.
 * item's creation date).
 *
 * Omit "a" to calculate a key between "b" and the start of the list.
 * Omit "b" to calculate a key between "a" and the end of the list.
 * Omit both to get the initial key.
 */
export function chronokey(
  timestamp: Date | number,
  a?: string,
  b?: string
): string {
  const achrono = a?.slice(0, 8);
  const bchrono = b?.slice(0, 8);

  const now = encode(+timestamp);
  // Does the timestamp fit chronologically between "a" and "b"?
  const fits = (!achrono || achrono < now) && (!bchrono || now < bchrono);
  // If yes, we can use it (with an initial sortkey).
  // If not, we use timestamp from "a" (or "b", if there's no "a"), and rely
  // on sortkey for correct order.
  const chrono = fits ? now : (achrono ?? bchrono)!;
  const sort = sortkey(
    achrono === chrono ? a!.slice(8) : undefined,
    bchrono === chrono ? b!.slice(8) : undefined
  );

  return `${chrono}${sort}`;
}

const MAX_MS_SINCE_EPOCH = 253402300799999; // 9999-12-31T23:59:59.999Z

function encode(msSinceEpoch: number): string {
  if (msSinceEpoch > MAX_MS_SINCE_EPOCH) {
    throw new Error("Cannot encode date after year 9999");
  }

  // The number of milliseconds since epoch fits into 48 bits (6 bytes) until
  // the year 9999.
  const bytes = new Uint8Array(6);

  for (let i = bytes.length - 1; msSinceEpoch !== 0; i--) {
    bytes[i] = msSinceEpoch & 0xff;
    msSinceEpoch = Math.trunc(msSinceEpoch / 0x100);
  }

  // This works just as regular Base64 encoding, except we don't have to deal
  // with padding, because input is always 6 bytes, and output is always
  // 8 characters.
  const indicies: number[] = [];

  for (let i = 0; i < bytes.length; i += 3) {
    // 00000011 11112222 22333333
    indicies.push(
      bytes[i] >> 2,
      ((bytes[i] & 0x03) << 4) | (bytes[i + 1] >> 4),
      ((bytes[i + 1] & 0x0f) << 2) | (bytes[i + 2] >> 6),
      bytes[i + 2] & 0x3f
    );
  }

  console.log(indicies.map((i) => i.toString(2)));
  console.log(indicies);
  return fromIndicies(indicies);
}

// export function decode(key: string): number {
//   const indicies = toIndicies(key);
//   let msSinceEpoch = 0;

//   for (let i = 0; i < indicies.length; i += 4) {
//     // 000000 001111 111122 222222
//     msSinceEpoch =
//       msSinceEpoch * 0x100_00_00 +
//       ((indicies[i] << 2) | (indicies[i + 1] >> 4)) * 0x100_00 +
//       (((indicies[i + 1] << 4) | (indicies[i + 2] >> 2)) & 0xff) * 0x100 +
//       (((indicies[i + 2] << 6) | indicies[i + 3]) & 0xff);
//   }

//   return msSinceEpoch;
// }
