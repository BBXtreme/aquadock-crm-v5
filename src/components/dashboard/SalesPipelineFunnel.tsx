import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SalesPipelineFunnelProps {
  leads?: number
  qualified?: number
  proposal?: number
  negotiation?: number
  won?: number
  changePercent?: number
}

const defaultProps: SalesPipelineFunnelProps = {
  leads: 680,
  qualified: 480,
  proposal: 210,
  negotiation: 120,
  won: 45,
  changePercent: 18.2,
}

export default function SalesPipelineFunnel(props: SalesPipelineFunnelProps = defaultProps) {
  const {
    leads = 680,
    qualified = 480,
    proposal = 210,
    negotiation = 120,
    won = 45,
    changePercent = 18.2,
  } = props

  const stages = [
    {
      name: 'Leads',
      value: leads,
      clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)',
    },
    {
      name: 'Qualified',
      value: qualified,
      clipPath: 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      clipPath: 'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)',
    },
    {
      name: 'Negotiation',
      value: negotiation,
      clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)',
    },
    {
      name: 'Won',
      value: won,
      clipPath: 'polygon(20% 0%, 80% 0%, 70% 100%, 30% 100%)',
    },
  ]

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-foreground mb-4">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative flex flex-col">
          {stages.map((stage, index) => (
            <div key={stage.name}>
              <div
                className="h-20 bg-gradient-to-b from-blue-50 to-blue-800 text-white flex justify-between items-center p-4 lg:p-6"
                style={{ clipPath: stage.clipPath }}
              >
                <span className="text-4xl lg:text-5xl font-bold">{stage.value}</span>
                <span className="text-lg lg:text-xl font-medium text-white/90">{stage.name}</span>
              </div>
              {index < stages.length - 1 && (
                <div className="h-px bg-white/20"></div>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm italic text-green-500 text-center mt-4">
          Leads increased by {changePercent}% since last month.
        </p>
      </CardContent>
    </Card>
  )
}
