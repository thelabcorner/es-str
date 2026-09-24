export default {
  host: 'illustrator',
  hostTypes: 'Illustrator/2022',
  additionalTypes: ['./src/globals.d.ts'],
  entry: 'src/runtime.ts',
  outfile: 'dist/vendor-esstr-runtime.js',
  globalName: 'ESSTR',
  target: 'illustrator',
  requireTarget: false,
  sourceLint: true,
  typecheck: true,
  normalize: true,
  compatibilityTransforms: ['esbuild'],
  compatibilityShims: [],
  allowedMissingBuiltins: [],
  allowedGlobalPatches: [],
  prelude: [],
  footer: [
    { file: 'tooling/vendor-install-footer.js' }
  ],
  allowJson: false,
  allowIncludes: false,
  live: false,
  liveLaunch: false
};
