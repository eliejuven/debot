interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-surface-3 text-text-secondary border-border',
  green: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  yellow: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20',
  red: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  purple: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
}

const sizes = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded border font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'default'> = {
    OPEN: 'yellow',
    ANSWERED: 'blue',
    VERIFIED: 'green',
    CLOSED: 'default',
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

export function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, 'default' | 'blue' | 'purple' | 'green'> = {
    FREE: 'default',
    PRO: 'blue',
    ENTERPRISE: 'purple',
  }
  return <Badge variant={map[tier] ?? 'default'}>{tier}</Badge>
}

export function TrustTierBadge({ reputation }: { reputation: number }) {
  if (reputation >= 1000) return <Badge variant="purple">EXPERT</Badge>
  if (reputation >= 200) return <Badge variant="green">TRUSTED</Badge>
  if (reputation >= 50) return <Badge variant="blue">CONTRIBUTOR</Badge>
  return <Badge variant="default">NEWCOMER</Badge>
}
