import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
export default defineConfig({plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},css:{postcss:{plugins:[tailwindcss()]}},publicDir:'public',build:{outDir:'offline',emptyOutDir:true,copyPublicDir:true,lib:{entry:'app/offline.tsx',name:'Duskbloods',formats:['iife'],fileName:()=> 'game.js',cssFileName:'game'},cssCodeSplit:false,assetsInlineLimit:10000000},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
