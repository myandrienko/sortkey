<p align="center"><img src="https://raw.githubusercontent.com/myandrienko/sortkey/main/logo.png" alt="Sortkey Logo" width="400"></p>

_Sortkey_ generates compact string keys to store a user-defined order of items
in lists. This is useful if you’re building an app that allows users to manually
reorder items (notes, photos, etc.) and you want to persist that user-defined
order.

Sortkeys have several nice features:

1. Sortable: on the backend, you simply sort your items by their keys
   alphabetically (lexicographically) to retrieve them in the correct order.
2. Stable: reordering a single item only changes the sortkey of that item.
   Reordering with sortkeys is a cheap operation.
3. Compact: keys don’t grow very fast. In the worst case, it takes six
   insertions for the key to grow by one character. It takes almost a hundred
   insertions for the key to grow to 16 characters.

## Installation

```ts
npm install @myandrienko/sortkey
pnpm add @myandrienko/sortkey
yarn add @myandrienko/sortkey
```

Sortkey is distributed as ESM:

```ts
import { sortkey } from "@myandrienko/sortkey";
```

## Sortkey API

Sortkey provides a single function to generate keys:

```ts
function sortkey(a?: string, b?: string): string;
```

It takes two keys and returns a key that fits between them:

```ts
sortkey("2Z", "2c"); // 2a fits between 2Z and 2c
sortkey("2Z", "2a"); // 2_ fits between 2Z and 2a
sortkey("2Z", "2_"); // 2ZV fits between 2Z and 2_
```

And indeed, the alphabetical (lexicographic) order of the items in this case
is:  
2Z < 2ZV < 2\_ < 2a < 2c.

To get a key that fits after the last item in the list, omit the second
argument:

```ts
sortkey("z"); // z < zV
```

To get a key that fits before the first item in the list, omit the first
argument:

```ts
sortkey(undefined, "0"); // -V < 0
```

Finally, to get an initial key (when inserting the first item in the list), omit
both arguments:

```ts
sortkey(); // always returns V
```

## Optimizing for Chronological Order

Items in the list may have an intrinsic order that is applied by default when
new items are added. Very often this intrinsic order is either chronological
(e.g. new notes are appended to the bottom of the list) or reverse chronological
(e.g. new emails are prepended to the top of the list).

This is the worst-case scenario for sortkeys, because adding new items to the
same position causes the sortkey to grow at the rate of one character every six
insertions.

To avoid this, you can use a special version of sortkey that is optimized for
intrinsic chronological order and appending, called _chronokey:_

```ts
import { chronokey } from "@myandrienko/sortkey/chrono";
```

Chronokey is prefixed with an 8-character sequence that encodes a timestamp with
millisecond precision. This allows the key to remain short unless the
chronological order is manually overridden by the user.

## Chronokey API

The chronokey API is similar to that of sortkey, but it takes timestamp as an
additional first argument:

```ts
function chronokey(timestamp: Date | number, a?: string, b?: string): string;
```

It’s probably a good idea to use an item’s creation date as a timestamp.

To append a new item to the bottom of the list:

```ts
const items: Array<{ createdAt: Date; key: string }> = [
  /* ... */
];

const createdAt = new Date();
chronokey(createdAt, items.at(-1));
```

Reordering of items works the same way as with sortkeys:

```ts
const insertAfter: number; // insertion position
chronokey(item.createdAt, items[insertAfter].key, items[insertAfter + 1].key);
```

## How Does It Work?

It’s not necessary to understand how keys are generated in order to use them.
But if you’re curious, this section is for you!

The most natural way to store the order of items is to use their indices:

```
   Eeny  (index: 0)
   Meeny (index: 1)
   Miny  (index: 2)
   Moe   (index: 3)
```

The downside of this approach is that changing the order of a single item
requires updating indicies of all the items that follow it:

```
   Eeny  (index: 0)
┌► Moe   (index: 3 → 1)
│  Meeny (index: 1 → 2)
│  Miny  (index: 2 → 3)
└─ Moe
```

A popular solution to this problem to use float indicies. Instead of
re-enumerating the item that changed order and all the items that follow, we
simply pick a fractional index that fits between two items:

```
   Eeny  (index: 0)
┌► Moe   (index: 3 → (0 + 1) / 2 = 0.5)
│  Meeny (index: 1)
│  Miny  (index: 2)
└─ Moe
```

This works fine—for a while. Numbers in JavaScript are double precision floats,
which gives us 53 significand bits. This means that if we insert elements in the
same position more than 53 times, we won’t be able to generate new indicies:

```ts
let a = 0;
let b = 1;
let count = 0;
while (a !== b) {
  a = (a + b) / 2;
  count++;
}
console.log("Precision lost after", count, "insertions");
```

```
Precision lost after 54 insertions
```

An obvious next step would be to use decimals, and store indicies as a strings.
The great thing about decimals is that, as long as the integer part of decimal
indicies doesn’t change, their alphabetical (lexicographic) order is the same as
their arithmetic order. Indeed, both are true:

<p align="center">
  0.1 < 0.15 < 0.2 <br>
  "0.1" < "0.15" < "0.2"
</p>

So, as long as we are only picking indicies in the range between 0 and 1, we can
omit “0.” and use the fractional part as the index.

But before you run `npm install decimal.js`, let’s go one step further.

Now that we’re serializing numbers to strings, why limit ourselves to ten
digits? We have all of Unicode at our disposal. Math works the same way in any
base, be it base 10 (decimals), base 2 (binary fractions), or base 64.

And if the characters we choose for our base-64 digits are in alphabetical
(lexicographic) order, the arithmetic order of the fractions is preserved when
they are serialized to string.

That’s exactly how sortkeys work. Each sortkey represents the fractional part of
a base-64 fraction between 0 and 1. The sortkey that fits between _a_ and _b_ is
the fractional part of $$\frac{0.a_{64} + 0.b_{64}}{2}$$ in base 64.

These are the characters that represent digits in sortkeys:

```
 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
 -  0  1  2  3  4  5  6  7  8  9  A  B  C  D  E

16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
 F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U

32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47
 V  W  X  Y  Z  _  a  b  c  d  e  f  g  h  i  j

48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63
 k  l  m  n  o  p  q  r  s  t  u  v  w  x  y  z
```

The initial sortkey, returned by `sortkey()` without arguments, is
$V_{64} = 32_{10}$, which represents decimal 0.5 in base 64:

$$0.5 = \frac{32}{64} = 0.V_{64}$$

Sortkey that fits after $V_{64}$, returned by `sortkey("V")`, is
$k_{64} = 48_{10}$:

$$\frac{0.5 + 1}{2} = 0.75 = \frac{48}{64} = 0.k_{64}$$

Sortkey that fits before $V_{64}$, returned by `sortkey(undefined, "V")`, is
$F_{64} = 16_{10}$:

$$\frac{0 + 0.5}{2} = 0.25 = \frac{16}{64} = 0.F_{64}$$

It’s important that the base we choose for sortkeys is even. In odd bases,
dividing by two can produce a period fraction with a non-zero period, which we
won’t be able to serialize to string. In even bases, dividing “finite” fractions
by two always produces another “finite” fraction.

### Enconding Timestamps

Chronokeys are sortkeys prefixed with a timestamp. To serialize a timestamp
using the same 64 characters we use for sortkeys, we use an encoding similar to
Base64: every three octets of a timestamp are encoded into four base-64
characters.

In our case, a timestamp is an integer representing the number of milliseconds
since the UNIX epoch. All such timestamps fit into 48 bits up to the year 9999,
so we can safely encode them using eight base-64 characters.

To do this, we write down 48 bits of a timestamp, big-endian. For example:

**Timestamp:** 2025-02-09T17:20:09.941Z  
**Milliseconds since epoch:** 1739121609941  
**Octets (big-endian):**

```
00000001 10010100 11101011 10111001 11001100 11010101
```

Then, we reinterpret octets as sextets, each representing a base-64 character:

```
    00000001 10010100 11101011 10111001 11001100 11010101
    └────┘└─────┘└─────┘└────┘ └────┘└─────┘└─────┘└────┘
b10    0    25     19     43     46    28     51     21
b64    -     O      I      f      i     R      n      K
```

So, `chronokey(new Date("2025-02-09T17:20:09.941Z"))` starts with -OIfiRnK.

Fun fact: “-” will remain the first character of all timestamps until 2109. May
15, 2109 at 7:35:11.104 UTC is 0-------.

### Combining Timestamps with Sortkeys

To generate the initial chronokey, we prefix the initial sortkey (V) with a
given timestamp, for example -OIfiRnKV.

To generate a chronokey _c_ that fits between _a_ and _b_, we split _a_ and _b_
into the “timestamp” part (first eight symbols) and “sortkey” part (all the
rest). Then, three cases are possible:

1. Item’s timestamp fits strictly between _a_’s and _b_’s timestamps. (This
   means that it is greater that _a_’s and less that _b_’s.) Then, we don’t need
   a sortkey to ensure alphabetical (lexicographic) order, so we just append the
   initial sortkey V to the timestamp:

```
a │ -OIfiRnK | V
b │ -OL5L8Ty │ 2a
──┼──────────┼───
c │ -OJt6Cfp │ V
```

2. Item’s timestamp doesn’t fit between _a_ and _b_, and _a_’s and _b_’s
   timestamps are different. Then we use _a_’s timestamp as a prefix (or _b_’s
   if _a_ is omitted), and build a sortkey that fits after _a_’s (or before
   _b_’s if _a_ is omitted):

```
a │ -OIfiRnK | V
b │ -OL5L8Ty │ 2a
──┼──────────┼───
c │ -OIfiRnK │ k
```

3. Item’s timestamp doesn’t fit between _a_ and _b_, and _a_’s and _b_’s
   timestamps are equal. Then we use this timestamp as a prefix, and build a
   sortkey that fits between _a_’s and _b_’s:

```
a │ -OIfiRnK | 2Z
b │ -OIfiRnK │ 2a
──┼──────────┼───
c │ -OIfiRnK │ 2_
```

As you can see, an item’s timestamp prefix can change to fit alphabetical
(lexicographic) order, so don’t try to decode it back into a date. Treat keys as
opaque objects.
