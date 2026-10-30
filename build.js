const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = [
  {
    entryPoints: ['src/main.ts'],
    outfile: 'script.js',
    bundle: true,
    minify: false,
    sourcemap: true,
    target: ['es2020'],
    format: 'iife',
  },
  {
    entryPoints: ['src/auth.ts'],
    outfile: 'auth.js',
    bundle: true,
    minify: false,
    sourcemap: true,
    target: ['es2020'],
    format: 'iife',
  },
  {
    entryPoints: ['src/profile.ts'],
    outfile: 'profile.js',
    bundle: true,
    minify: false,
    sourcemap: true,
    target: ['es2020'],
    format: 'iife',
  },
];

async function run() {
  try {
    for (const opt of buildOptions) {
      if (isWatch) {
        const ctx = await esbuild.context(opt);
        await ctx.watch();
        console.log(`Watching ${opt.entryPoints[0]} -> ${opt.outfile}`);
      } else {
        await esbuild.build(opt);
        console.log(`Built ${opt.entryPoints[0]} -> ${opt.outfile}`);
      }
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

run();
