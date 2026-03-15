interface MetricsCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

const accentColors = {
  blue: 'text-accent-blue',
  green: 'text-accent-green',
  yellow: 'text-accent-yellow',
  red: 'text-accent-red',
  purple: 'text-accent-purple',
}

export function MetricsCard({ label, value, sub, accent = 'blue' }: MetricsCardProps) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-5">
      <div className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-semibold font-mono ${accentColors[accent]}`}>{value}</div>
      {sub && <div className="text-text-muted text-xs mt-1">{sub}</div>}
    </div>
  )
}
