import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatPercentage = (value: number) => `${Math.round(value)}%`

export const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

export const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(new Date(iso))

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
