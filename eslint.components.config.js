import baseConfig from './eslint.config.js';

// Review signals, not correctness errors. Keep these out of normal lint/CI until
// the existing backlog has been reviewed and thresholds have proved useful.
export default [
  ...baseConfig,
  {
    ignores: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/fixtures/**',
    ],
  },
  {
    files: ['**/*.{svelte,ts,js,mjs}'],
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['warn', { max: 12 }],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 30],
      'max-params': ['warn', 5],
    },
  },
  {
    files: ['**/*.svelte'],
    rules: {
      // A Svelte file includes CSS and markup: distinguish these from logic.
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'svelte/max-lines-per-block': [
        'warn',
        {
          script: 200,
          template: 250,
          style: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
];
