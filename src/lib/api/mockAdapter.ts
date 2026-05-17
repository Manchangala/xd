import { sleep } from '@/lib/utils'

export const mockAdapter = async <T,>(
  factory: () => T,
  options?: { delay?: number; fail?: boolean },
): Promise<T> => {
  await sleep(options?.delay ?? 320)
  if (options?.fail) {
    throw new Error('Error simulado de red')
  }
  return factory()
}
