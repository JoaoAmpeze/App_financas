import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

/** Paleta com bom contraste para gráficos (cores mais saturadas e distintas) */
export const CHART_COLORS = [
  'rgb(34, 197, 94)',   // verde
  'rgb(59, 130, 246)',  // azul
  'rgb(168, 85, 247)',  // violeta
  'rgb(239, 68, 68)',   // vermelho
  'rgb(245, 158, 11)',  // âmbar
  'rgb(236, 72, 153)',  // pink
  'rgb(20, 184, 166)',  // teal
  'rgb(99, 102, 241)',  // índigo
]

export const CHART_COLORS_BORDER = [
  'rgb(22, 163, 74)',   // verde escuro
  'rgb(37, 99, 235)',   // azul escuro
  'rgb(126, 34, 206)',  // violeta escuro
  'rgb(220, 38, 38)',   // vermelho escuro
  'rgb(217, 119, 6)',   // âmbar escuro
  'rgb(219, 39, 119)',  // pink escuro
  'rgb(13, 148, 136)',  // teal escuro
  'rgb(79, 70, 229)',   // índigo escuro
]

export const PASTEL = {
  income: 'rgba(34, 197, 94, 0.9)',    // verde com bom contraste
  expense: 'rgba(239, 68, 68, 0.9)',   // vermelho com bom contraste
  balance: 'rgb(99, 102, 241)',         // índigo
  balanceFill: 'rgba(99, 102, 241, 0.15)',
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
