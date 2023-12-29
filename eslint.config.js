import { julr } from '@julr/tooling-configs/eslint'

export default await julr({
  typescript: {
    tsconfigPath: ['./tsconfig.json', './packages/verrou/tsconfig.json', './docs/tsconfig.json'],
  },
})
