/**
 * An alphabet similar to Base64, but it contains only URL-safe characters
 * in lexicographic order, so that the sort order of encoded values is preserved.
 */
const alphabet =
  "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

export const base: number = alphabet.length;

export function toIndicies(key: string): number[] {
  return key.split("").map((digit) => {
    let left = 0;
    let right = alphabet.length - 1;

    while (left < right) {
      const middle = Math.ceil((left + right) / 2);
      if (alphabet[middle] > digit) {
        right = middle - 1;
      } else {
        left = middle;
      }
    }

    if (alphabet[left] === digit) {
      return left;
    }

    throw new Error(`Unexpected character "${digit}" in sortkey`);
  });
}

export function fromIndicies(indicies: number[]): string {
  return indicies.map((index) => alphabet[index]).join("");
}
