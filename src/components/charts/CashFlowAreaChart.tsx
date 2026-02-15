import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { formatCurrency, PASTEL } from '@/lib/chartConfig'

export interface CashFlowAreaItem {
  monthKey: string
  name: string
  receita: number
  despesa: number
}

interface CashFlowAreaChartProps {
  data: CashFlowAreaItem[]
}

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#0f172a',
        font: { size: 13, weight: '600' },
        padding: 16,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      titleColor: '#0f172a',
      bodyColor: '#0f172a',
      bodyFont: { size: 13, weight: '500' },
      titleFont: { size: 13, weight: '600' },
      borderColor: '#cbd5e1',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#1e293b',
        font: { size: 12, weight: '500' },
      },
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#1e293b',
        font: { size: 12, weight: '500' },
        callback: (value) => formatCurrency(Number(value)),
      },
    },
  },
}

export default function CashFlowAreaChart({ data }: CashFlowAreaChartProps) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        label: 'Receita',
        data: data.map((d) => d.receita),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.25)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Despesa',
        data: data.map((d) => d.despesa),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  }

  return <Line data={chartData} options={options} />
}
