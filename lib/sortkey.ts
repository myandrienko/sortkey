import { base, fromIndicies, toIndicies } from "./alphabet.js";

/**
 * Calculates a key that fits lexicographically between keys "a" and "b".
 * Omit "a" to calculate a key between "b" and the start of the list.
 * Omit "b" to calculate a key between "a" and the end of the list.
 * Omit both to get the initial key.
 */
export function sortkey(a?: string, b?: string): string {
  return fromIndicies(mean(a ? toIndicies(a) : [], b ? toIndicies(b) : [base]));
}

/**
 * Given "a" and "b", which represent the fractional parts of base-64 numbers
 * 0.a and 0.b respectively, returns "c", which represents the fractional
 * part of their mean:
 *
 * 0.c = (0.a + 0.b) / 2
 */
function mean(a: number[], b: number[]): number[] {
  const c: number[] = [];
  let carry = 0;

  // We rely on the base being even. In odd bases, division by two can produce
  // non-zero periods, which are really annoying to write down.
  for (let i = 0; i < a.length || i < b.length || carry !== 0; i++) {
    const sum = (a[i] ?? 0) + (b[i] ?? 0) + carry;
    c[i] = sum >> 1;
    carry = sum % 2 ? base : 0;
  }

  let lsi = -1; // last significant index

  for (let i = c.length - 1; i >= 0; i--) {
    const carried = c[i] + carry;
    c[i] = carried % base;
    carry = (carried / base) >> 0;

    if (lsi === -1 && c[i] !== 0) {
      lsi = i;
    }
  }

  c.splice(lsi + 1);
  return c;
}

// function distribute(count: number, a?: string, b?: string): string[] {
//   const keys = [a, b];
//   const continuing = () => keys.length - 2 < count;

//   while (continuing()) {
//     for (let i = 1; i < keys.length && continuing(); i += 2) {
//       keys.splice(i, 0, sortkey(keys[i - 1], keys[i]));
//     }
//   }

//   return keys.slice(1, -1) as string[];
// }
