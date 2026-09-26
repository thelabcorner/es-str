export default {
  host: 'illustrator',
  hostTypes: 'Illustrator/2022',
  additionalTypes: ['./src/globals.d.ts'],
  entry: 'src/jsx-entry.ts',
  outfile: 'dist/vendor-esstr.js',
  globalName: '__ESSTR_ENTRY__',
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
