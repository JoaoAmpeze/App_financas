import { Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { formatCurrency, CHART_COLORS, CHART_COLORS_BORDER } from '@/lib/chartConfig'

interface PieItem {
  name: string
  categoryId: string
  value: number
}

interface ExpensesDoughnutChartProps {
  data: PieItem[]
  onSegmentClick?: (categoryId: string | null) => void
}

export default function ExpensesDoughnutChart({ data, onSegmentClick }: ExpensesDoughnutChartProps) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor: data.map((_, i) => CHART_COLORS_BORDER[i % CHART_COLORS_BORDER.length]),
        borderWidth: 3,
        hoverOffset: 12
      }
    ]
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#0f172a',
          font: { size: 13, weight: '600' },
          padding: 12,
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
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a: number, b) => a + Number(b), 0)
            const pct = total > 0 ? ((Number(ctx.raw) / total) * 100).toFixed(1) : 0
            return `${ctx.label}: ${formatCurrency(Number(ctx.raw))} (${pct}%)`
          }
        }
      }
    },
    onClick: (_evt, elements) => {
      if (!onSegmentClick) return
      if (elements.length === 0) {
        onSegmentClick(null)
        return
      }
      const idx = elements[0].index
      const item = data[idx]
      onSegmentClick(item?.categoryId ?? null)
    }
  }

  return <Doughnut data={chartData} options={options} /> 
}
