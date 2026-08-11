// ESSTR test vectors — shared between the Node harness and the live-verify
// battery. Inputs are strings (JSON/hex transport-safe); ops are
// trim / trimLeft / trimRight / trimStart / trimEnd. Expecteds are
// Node-native truth.
export var VECTORS: any[] = [];

function v(desc: string, input: any, op: string, expect: any): void {
  VECTORS[VECTORS.length] = { desc: desc, input: input, op: op, expect: expect };
}

// ---- basic ----
v('empty', '', 'trim', '');
v('plain unchanged', 'the quick brown fox jumps over the lazy dog', 'trim', 'the quick brown fox jumps over the lazy dog');
v('padded both', '  \tthe quick brown fox\r\n ', 'trim', 'the quick brown fox');
v('all ascii ws', ' \t\n\r\u000b\u000c ', 'trim', '');
v('single space', ' ', 'trim', '');
v('single char', 'q', 'trim', 'q');
v('tab edges', '\t\tx\t\t', 'trim', 'x');
v('interior kept', 'a \t b', 'trim', 'a \t b');

// ---- exotic whitespace (modern trim = WhiteSpace + LineTerminator + FEFF) ----
v('unicode Zs edges', '\u3000\u2003x\u00a0\u2028\u3000', 'trim', 'x');
v('unicode Zs sweep', '\u1680\u2000\u2009\u200a\u202f\u205f\u3000y\u3000', 'trim', 'y');
v('LS PS edges', '\u2028y\u2029', 'trim', 'y');
v('FEFF stripped', '\ufeffz\ufeff', 'trim', 'z');
v('NEL kept', '\u0085w\u0085', 'trim', '\u0085w\u0085');
v('ZWSP kept', '\u200bv\u200b', 'trim', '\u200bv\u200b');
v('Mongolian vowel sep kept', '\u180eq\u180e', 'trim', '\u180eq\u180e');
v('all unicode ws', '\u3000\u00a0\u2003', 'trim', '');
v('NBSP edges', '\u00a0x\u00a0', 'trim', 'x');

// ---- NUL and surrogates (charCodeAt-safe; charAt would lie) ----
v('NUL not ws', '\u0000x\u0000', 'trim', '\u0000x\u0000');
v('NUL interior', 'a\u0000b', 'trim', 'a\u0000b');
v('NUL between ws', ' \u0000 ', 'trim', '\u0000');
v('surrogates kept', '\ud83d\ude00x\ud83d\ude00', 'trim', '\ud83d\ude00x\ud83d\ude00');
v('lone surrogate kept', '\ud800x', 'trim', '\ud800x');

// ---- ToString coercion (numbers/booleans coerce; null/undefined throw) ----
v('number coerced', 123, 'trim', '123');
v('zero coerced', 0, 'trim', '0');
v('boolean coerced', true, 'trim', 'true');
v('negative number', -7, 'trim', '-7');
v('null throws', null, 'trim', 'TypeError');
v('undefined throws', undefined, 'trim', 'TypeError');

// ---- trimLeft ----
v('left strip', '  \t x  ', 'trimLeft', 'x  ');
v('left none unchanged', 'x  ', 'trimLeft', 'x  ');
v('left all ws', ' \t\n ', 'trimLeft', '');
v('left unicode', '\u3000\u2028x', 'trimLeft', 'x');
v('left FEFF', '\ufeffx', 'trimLeft', 'x');
v('left NUL kept', '\u0000x', 'trimLeft', '\u0000x');

// ---- trimRight ----
v('right strip', '  x  \t\n ', 'trimRight', '  x');
v('right none unchanged', '  x', 'trimRight', '  x');
v('right all ws', ' \t\n ', 'trimRight', '');
v('right unicode', 'x\u3000\u2028', 'trimRight', 'x');
v('right FEFF', 'x\ufeff', 'trimRight', 'x');
v('right NUL kept', 'x\u0000', 'trimRight', 'x\u0000');

// ---- trimStart / trimEnd (ES2019 aliases) ----
v('start = left', '  \tx  ', 'trimStart', 'x  ');
v('end = right', '  x  \t', 'trimEnd', '  x');
v('start all ws', '\u3000\u00a0', 'trimStart', '');
v('end all ws', '\u3000\u00a0', 'trimEnd', '');

// ---- identity of unchanged results (fast path must return the same string) ----
v('clean trim returns same', 'plain', 'trim', 'plain');
v('clean left returns same', 'plain', 'trimLeft', 'plain');
v('clean right returns same', 'plain', 'trimRight', 'plain');
