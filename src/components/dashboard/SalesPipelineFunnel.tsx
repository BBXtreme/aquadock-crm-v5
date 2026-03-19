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
      height: 'h-[98px] md:h-[140px]',
      gradient: 'bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)',
      numberSize: 'text-3xl md:text-4xl lg:text-5xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Qualified',
      value: qualified,
      height: 'h-[84px] md:h-[120px]',
      gradient: 'bg-gradient-to-b from-blue-100 to-blue-200 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(7.5% 0%, 92.5% 0%, 77.5% 100%, 22.5% 100%)',
      numberSize: 'text-3xl md:text-4xl lg:text-5xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      height: 'h-[70px] md:h-[100px]',
      gradient: 'bg-gradient-to-b from-blue-200 to-blue-400 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(15% 0%, 85% 0%, 70% 100%, 30% 100%)',
      numberSize: 'text-3xl md:text-4xl lg:text-5xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Negotiation',
      value: negotiation,
      height: 'h-[56px] md:h-[80px]',
      gradient: 'bg-gradient-to-b from-blue-400 to-blue-600 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(22.5% 0%, 77.5% 0%, 62.5% 100%, 37.5% 100%)',
      numberSize: 'text-3xl md:text-4xl lg:text-5xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
    {
      name: 'Won',
      value: won,
      height: 'h-[42px] md:h-[60px]',
      gradient: 'bg-gradient-to-b from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-900',
      clipPath: 'polygon(30% 0%, 70% 0%, 55% 100%, 45% 100%)',
      numberSize: 'text-3xl md:text-4xl lg:text-5xl',
      nameSize: 'text-lg lg:text-xl md:text-lg',
    },
  ]

  return (
    <Card className="bg-card border-border shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground text-center">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-6">
        <div className="relative flex flex-col">
          {stages.map((stage, index) => (
            <div key={stage.name}>
              <div
                className={`${stage.height} ${stage.gradient} text-white flex flex-col items-center text-center md:flex-row md:justify-between md:items-center p-4 lg:p-6 hover:shadow-lg hover:shadow-white/50 transition-shadow duration-300`}
                style={{ clipPath: stage.clipPath }}
              >
                <span className={`${stage.numberSize} font-sans font-bold pl-4`}>{stage.value}</span>
                <span className={`${stage.nameSize} font-sans font-medium text-white/90 pr-4`}>{stage.name}</span>
              </div>
              {index < stages.length - 1 && (
                <div className="h-px bg-white/20"></div>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm italic text-center mt-6 text-green-500 dark:text-green-400">
          Leads increased by {changePercent}% since last month.
        </p>
      </CardContent>
    </Card>
  )
}
