import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 계산 엔진·SSO 검증 등 DB 없이 도는 단위 테스트만 둠
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { include: ['lib/**/__tests__/**/*.test.ts'], environment: 'node' },
})
