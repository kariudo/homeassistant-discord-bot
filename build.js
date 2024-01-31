#!/usr/bin/env bun

console.log("Building...")
await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'bun',
    // minify: {
    //     whitespace: true,
    //     identifiers: true,
    //     syntax: true,
    //   },
  });
console.log("Done.")