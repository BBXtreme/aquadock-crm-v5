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
    { name: 'Leads', value: leads, width: 'w-full' },
    { name: 'Qualified', value: qualified, width: 'w-4/5' },
    { name: 'Proposal Sent', value: proposal, width: 'w-3/5' },
    { name: 'Negotiation', value: negotiation, width: 'w-2/5' },
    { name: 'Won', value: won, width: 'w-1/5' },
  ]

  const changeColor = changeTextColor === 'green' ? 'text-green-600' : 'text-red-600'

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative flex flex-col items-center space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.name}
              className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-800 dark:from-blue-700 dark:to-blue-900 text-white rounded-lg ${stage.width} transition-all duration-300`}
            >
              <span className="text-2xl font-bold">{stage.value}</span>
              <span className="text-sm font-medium">{stage.name}</span>
            </div>
          ))}
        </div>
        <p className={`text-sm italic text-center ${changeColor}`}>
          Leads increased by {changePercent}% since last month.
        </p>
      </CardContent>
    </Card>
  )
}
