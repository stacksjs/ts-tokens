import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
  },
  {
    rules: {
      'no-console': 'off',
      'antfu/no-top-level-await': 'off',
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
      'ts/no-explicit-any': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'off',
      'ts/explicit-function-return-type': 'off',
      'no-new': 'off',
      'no-unmodified-loop-condition': 'off',
      'no-case-declarations': 'off',
      'ts/no-require-imports': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/coverage/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.vscode/**',
      '**/.idea/**',
      '**/bin/tokens',
    ],
  },
)
