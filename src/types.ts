export interface InstallOptions {
  /** Replace native implementations even when present. Default: false. */
  forceReplace?: boolean;
}

export interface CapabilityReport {
  /** ExtendScript engine version, e.g. "4.5.6". */
  engine: string;
  /** Methods already provided natively (install skips these). */
  nativeList: string[];
  /** Methods absent natively (install gap-fills these). */
  missing: string[];
}

export interface BenchItem {
  lane: string;
  n: number;
  iterations: number;
  medianUs: number;
  minUs: number;
  p95Us: number;
  elemUs: number;
}
