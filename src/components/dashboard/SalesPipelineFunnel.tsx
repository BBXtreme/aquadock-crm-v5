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
    {
      name: 'Leads',
      value: leads,
      height: 'h-[140px] md:h-[140px]',
      gradient: 'bg-gradient-to-b from-blue-50 to-blue-200 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)',
      numberSize: 'text-4xl lg:text-5xl md:text-3xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Qualified',
      value: qualified,
      height: 'h-[120px] md:h-[120px]',
      gradient: 'bg-gradient-to-b from-blue-200 to-blue-400 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)',
      numberSize: 'text-4xl lg:text-5xl md:text-3xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      height: 'h-[100px] md:h-[100px]',
      gradient: 'bg-gradient-to-b from-blue-400 to-blue-600 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)',
      numberSize: 'text-4xl lg:text-5xl md:text-3xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Negotiation',
      value: negotiation,
      height: 'h-[80px] md:h-[80px]',
      gradient: 'bg-gradient-to-b from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)',
      numberSize: 'text-4xl lg:text-5xl md:text-3xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Won',
      value: won,
      height: 'h-[60px] md:h-[60px]',
      gradient: 'bg-gradient-to-b from-blue-800 to-blue-900 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(20% 0%, 80% 0%, 70% 100%, 30% 100%)',
      numberSize: 'text-4xl lg:text-5xl md:text-3xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
  ]

  const changeColor = changeTextColor === 'green' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-foreground">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative flex flex-col">
          {stages.map((stage, index) => (
            <div key={stage.name}>
              <div
                className={`${stage.height} ${stage.gradient} text-white flex justify-between items-center p-4 lg:p-6`}
                style={{ clipPath: stage.clipPath }}
              >
                <span className={`${stage.numberSize} font-bold`}>{stage.value}</span>
                <span className={`${stage.nameSize} font-medium text-white/90`}>{stage.name}</span>
              </div>
              {index < stages.length - 1 && (
                <div className="h-px bg-white/20 dark:bg-gray-600"></div>
              )}
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
