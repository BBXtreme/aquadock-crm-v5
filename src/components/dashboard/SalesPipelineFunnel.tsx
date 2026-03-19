import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    { name: 'Leads', value: leads, clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' },
    { name: 'Qualified', value: qualified, clipPath: 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)' },
    { name: 'Proposal Sent', value: proposal, clipPath: 'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)' },
    { name: 'Negotiation', value: negotiation, clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
    { name: 'Won', value: won, clipPath: 'polygon(20% 0%, 80% 0%, 70% 100%, 30% 100%)' },
  ]

  const changeColor = changeTextColor === 'green' ? 'text-[#10B981]' : 'text-red-600'

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative flex flex-col space-y-0">
          {stages.map((stage, index) => (
            <div
              key={stage.name}
              className="relative h-16 bg-gradient-to-b from-[#EFF6FF] to-[#1E40AF] dark:from-[#1E293B] dark:to-[#0F172A] text-white"
              style={{ clipPath: stage.clipPath }}
            >
              <div className="absolute inset-0 flex items-center justify-between px-6">
                <span className="text-4xl font-bold">{stage.value}</span>
                <span className="text-lg font-medium text-gray-200">{stage.name}</span>
              </div>
            </div>
          ))}
        </div>
        <p className={`text-sm italic text-center mt-4 ${changeColor}`}>
          Leads increased by {changePercent}% since last month.
        </p>
      </CardContent>
    </Card>
  )
}
