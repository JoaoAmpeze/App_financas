import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { formatCurrency, PASTEL } from '@/lib/chartConfig'

interface DataPoint {
  date: string
  balance: number
}

interface BalanceLineChartProps {
  data: DataPoint[]
}

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: { display: false },
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
        label: (ctx) => `Saldo: ${formatCurrency(ctx.parsed.y)}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#1e293b',
        maxRotation: 45,
        font: { size: 12, weight: '500' }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#1e293b',
        font: { size: 12, weight: '500' },
        callback: (value) => formatCurrency(Number(value))
      }
    }
  }
}

export default function BalanceLineChart({ data }: BalanceLineChartProps) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Saldo',
        data: data.map((d) => d.balance),
        borderColor: PASTEL.balance,
        backgroundColor: PASTEL.balanceFill,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: PASTEL.balance,
        borderWidth: 2
      }
    ]
  }

  return <Line data={chartData} options={options} /> 
}
