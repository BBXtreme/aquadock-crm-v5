import { Card, CardContent } from '@/components/ui/card'

interface SalesPipelineFunnelProps {
  leads?: number
  qualified?: number
  proposal?: number
  negotiation?: number
  won?: number
  changePercent?: number
  changeTextColor?: 'green' | 'red'
}

const defaultProps: SalesPipelineFunnelProps = {
  leads: 680,
  qualified: 480,
  proposal: 210,
  negotiation: 120,
  won: 45,
  changePercent: 18.2,
  changeTextColor: 'green',
}

export default function SalesPipelineFunnel(props: SalesPipelineFunnelProps = defaultProps) {
  const {
    leads = 680,
    qualified = 480,
    proposal = 210,
    negotiation = 120,
    won = 45,
    changePercent = 18.2,
    changeTextColor = 'green',
  } = props

  const stages = [
    {
      name: 'Leads',
      value: leads,
      height: 'h-[30px] md:h-[42px]',
      gradient: 'bg-blue-500',
      clipPath: 'polygon(20% 0%, 80% 0%, 75% 100%, 25% 100%)',
    },
    {
      name: 'Qualified',
      value: qualified,
      height: 'h-[25px] md:h-[36px]',
      gradient: 'bg-green-500',
      clipPath: 'polygon(25% 0%, 75% 0%, 70% 100%, 30% 100%)',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      height: 'h-[21px] md:h-[30px]',
      gradient: 'bg-yellow-500',
      clipPath: 'polygon(30% 0%, 70% 0%, 65% 100%, 35% 100%)',
    },
    {
      name: 'Negotiation',
      value: negotiation,
      height: 'h-[17px] md:h-[24px]',
      gradient: 'bg-orange-500',
      clipPath: 'polygon(35% 0%, 65% 0%, 60% 100%, 40% 100%)',
    },
    {
      name: 'Won',
      value: won,
      height: 'h-[13px] md:h-[18px]',
      gradient: 'bg-red-500',
      clipPath: 'polygon(40% 0%, 60% 0%, 55% 100%, 45% 100%)',
    },
  ]

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Pipeline</h3>
        <div className="flex flex-col items-center">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex items-center justify-center mb-1">
              <span className="text-xs font-bold text-foreground mr-1">{stage.value}</span>
              <div className={`${stage.height} ${stage.gradient} w-32`}></div>
              <span className="text-xs font-medium text-foreground ml-1">{stage.name}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">Leads increased by {changePercent}% since last month.</p>
      </CardContent>
    </Card>
  )
}
