import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

export default [
  // CommonJS
  {
    input: 'src/index.js',
    preserveModules: true,
    output: {
      dir: 'lib',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      commonjs(),
      terser(),
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
    ],
  },
  // ES
  {
    input: 'src/index.js',
    preserveModules: true,
    output: {
      dir: 'es',
      format: 'esm',
      exports: 'named',
    },
    plugins: [
      commonjs(),
      resolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
      }),
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
    ],
  },
];
