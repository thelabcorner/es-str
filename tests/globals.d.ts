// Test-harness globals (Node side; not part of the library).
declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
};

interface Math {
  imul(x: number, y: number): number;
}

// Node natives used as differential oracles.
interface String {
  trimLeft(): string;
  trimRight(): string;
  trimStart(): string;
  trimEnd(): string;
}

// esarr devDependency (dogfooded in the harnesses).
declare module 'esarr';
