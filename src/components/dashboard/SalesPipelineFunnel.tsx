import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SalesPipelineFunnelProps {
  leads?: number
  qualified?: number
  proposal?: number
  negotiation?: number
  won?: number
}

const defaultProps: SalesPipelineFunnelProps = {
  leads: 680,
  qualified: 480,
  proposal: 210,
  negotiation: 120,
  won: 45,
}

export default function SalesPipelineFunnel(props: SalesPipelineFunnelProps = defaultProps) {
  const {
    leads = 680,
    qualified = 480,
    proposal = 210,
    negotiation = 120,
    won = 45,
  } = props

  const stages = [
    {
      name: 'Leads',
      value: leads,
      height: 'h-[98px] md:h-[140px]',
      gradient: 'bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(20% 0%, 80% 0%, 75% 100%, 25% 100%)',
    },
    {
      name: 'Qualified',
      value: qualified,
      height: 'h-[84px] md:h-[120px]',
      gradient: 'bg-gradient-to-b from-blue-100 to-blue-200 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(25% 0%, 75% 0%, 70% 100%, 30% 100%)',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      height: 'h-[70px] md:h-[100px]',
      gradient: 'bg-gradient-to-b from-blue-200 to-blue-400 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(30% 0%, 70% 0%, 65% 100%, 35% 100%)',
    },
    {
      name: 'Negotiation',
      value: negotiation,
      height: 'h-[56px] md:h-[80px]',
      gradient: 'bg-gradient-to-b from-blue-400 to-blue-600 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(35% 0%, 65% 0%, 60% 100%, 40% 100%)',
    },
    {
      name: 'Won',
      value: won,
      height: 'h-[42px] md:h-[60px]',
      gradient: 'bg-gradient-to-b from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(40% 0%, 60% 0%, 55% 100%, 45% 100%)',
    },
  ]

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-foreground">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative flex flex-col">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex items-center justify-center">
              <span className="text-sm font-bold text-foreground mr-4">{stage.value}</span>
              <div
                className={`${stage.height} ${stage.gradient} flex-1 max-w-xs`}
                style={{ clipPath: stage.clipPath }}
              ></div>
              <span className="text-sm font-medium text-foreground ml-4">{stage.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
