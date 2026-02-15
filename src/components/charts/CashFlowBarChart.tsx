import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { formatCurrency, PASTEL } from '@/lib/chartConfig'

interface BarItem {
  monthKey: string
  name: string
  receita: number
  despesa: number
}

interface CashFlowBarChartProps {
  data: BarItem[]
}

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#0f172a',
        font: { size: 13, weight: '600' },
        padding: 16,
        usePointStyle: true
      }
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
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(0, 0, 0, 0.06)', drawBorder: true },
      ticks: {
        color: '#1e293b',
        font: { size: 12, weight: '500' }
      },
      border: { color: 'rgba(0, 0, 0, 0.12)' }
    },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.06)', drawBorder: true },
      ticks: {
        color: '#1e293b',
        font: { size: 12, weight: '500' },
        callback: (value) => formatCurrency(Number(value))
      },
      border: { color: 'rgba(0, 0, 0, 0.12)' }
    }
  }
}

export default function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        label: 'Receita',
        data: data.map((d) => d.receita),
        backgroundColor: PASTEL.income,
        borderRadius: 8,
        barThickness: 24
      },
      {
        label: 'Despesa',
        data: data.map((d) => d.despesa),
        backgroundColor: PASTEL.expense,
        borderRadius: 8,
        barThickness: 24
      }
    ]
  }

  return <Bar data={chartData} options={options} /> 
}
