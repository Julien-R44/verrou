import { julr } from '@julr/tooling-configs/eslint'

export default await julr({
  typescript: {
    typeAwareRules: true,
    tsconfigPath: ['./tsconfig.json', './packages/verrou/tsconfig.json', './docs/tsconfig.json'],
  },
})
