import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage } from '@/lib/storage/localStorage'
import { seedMockData } from '@/mocks/seed'
import './index.css'

seedMockData()

const storedTheme = readStorage<{ theme?: 'light' | 'dark' }>(
  STORAGE_KEYS.settings,
  {},
).theme

document.body.classList.toggle('dark', storedTheme === 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
