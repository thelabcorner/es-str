// ExtendScript (ES3) globals referenced by ESARR.
declare interface Object {
  // ExtendScript-ism: every object exposes its internal class name.
  __class__?: string;
}

declare interface Function {
  call(thisArg: any, ...args: any[]): any;
  apply(thisArg: any, argArray?: any): any;
}

declare var $: {
  version: string;
  hiresTimer: number;
  global: any;
  evalFile(path: string, timeout?: number): any;
};

declare var ExternalObject: any;
declare var ESCHARS_ACCEL_BUNDLE: string;
declare var global: any;
