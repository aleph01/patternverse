import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import { markdownSchema } from "sanity-plugin-markdown";

console.log('process.env');
console.log(process.env);

export default defineConfig({
  name: 'default',
  title: 'patternverse',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET!,

  plugins: [structureTool(), visionTool(), markdownSchema()],

  schema: {
    types: schemaTypes,
  },
})
