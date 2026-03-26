"use client";

import { useQuery } from "@tanstack/react-query";
import { Building, DollarSign, Trophy, Users } from "lucide-react";
import { useMemo } from "react";
import {
	Cell,
	Funnel,
	FunnelChart,
	LabelList,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";

export default function DashboardPage() {
	const { data: companies = [], isLoading } = useQuery({
		queryKey: ["companies"],
		queryFn: async () => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("companies")
				.select("*, contacts!company_id(*)");
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
	});

	// Memoized stats – prevents unnecessary recalculations
	const stats = useMemo(() => {
		const total = companies.length;
		const leads = companies.filter((c) => c.status === "lead").length;
		const won = companies.filter((c) => c.status === "won").length;
		const value = companies.reduce((sum, c) => sum + (c.value ?? 0), 0);

		return { total, leads, won, value };
	}, [companies]);

	// Mock funnel data (safe, no undefined issues)
	const funnelData = useMemo(
		() => [
			{ name: "Leads", value: 680, fill: "#0ea5e9" },
			{ name: "Qualified", value: 480, fill: "#22c55e" },
			{ name: "Proposal Sent", value: 210, fill: "#eab308" },
			{ name: "Negotiation", value: 120, fill: "#f97316" },
			{ name: "Won", value: 45, fill: "#10b981" },
		],
		[],
	);

	// Mock pie data
	const pieData = useMemo(
		() => [
			{ name: "Marinas", value: 9, fill: "#0ea5e9" },
			{ name: "Camping", value: 6, fill: "#22c55e" },
			{ name: "Hotels/Resorts", value: 4, fill: "#eab308" },
			{ name: "Restaurants", value: 3, fill: "#ef4444" },
			{ name: "Sonstige", value: 5, fill: "#a78bfa" },
		],
		[],
	);

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
			<div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
				<div className="flex items-center justify-between pb-6 border-b">
					<div>
						<div className="text-sm text-muted-foreground">
							Home → Dashboard
						</div>
						<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
							Dashboard
						</h1>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Gesamt Firmen"
						value={
							isLoading ? (
								<Skeleton className="h-8 w-20" />
							) : (
								stats.total.toLocaleString("de-DE")
							)
						}
						icon={<Building className="h-5 w-5 text-muted-foreground" />}
						change="+12% from last month"
					/>
					<StatCard
						title="Leads"
						value={
							isLoading ? (
								<Skeleton className="h-8 w-20" />
							) : (
								stats.leads.toLocaleString("de-DE")
							)
						}
						icon={<Users className="h-5 w-5 text-muted-foreground" />}
						change="+8% from last month"
					/>
					<StatCard
						title="Gewonnene Deals"
						value={
							isLoading ? (
								<Skeleton className="h-8 w-20" />
							) : (
								stats.won.toLocaleString("de-DE")
							)
						}
						icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
						change="+15% from last month"
					/>
					<StatCard
						title="Gesamtwert"
						value={
							isLoading ? (
								<Skeleton className="h-8 w-20" />
							) : (
								`€${stats.value.toLocaleString("de-DE")}`
							)
						}
						icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
						change="+22% from last month"
					/>
				</div>

				{/* Sales Funnel + Insights */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Sales Funnel</CardTitle>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="relative h-[400px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<FunnelChart>
										<Funnel
											dataKey="value"
											data={funnelData}
											isAnimationActive
											labelLine={false}
											stroke="none"
										>
											{funnelData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.fill} />
											))}
											{/* Left: numbers */}
											<LabelList
												position="left"
												offset={20}
												formatter={(value: number) =>
													value.toLocaleString("de-DE")
												}
												fill="#fff"
												fontSize={18}
												fontWeight="bold"
											/>
											{/* Right: stage + % */}
											<LabelList
												position="right"
												offset={20}
												formatter={(value: number, entry: unknown) => {
													const payload = entry as {
														payload?: { name?: string };
													};
													const name = payload?.payload?.name ?? "Stage";
													const percent = Math.round(
														(value / (funnelData[0]?.value || 1)) * 100,
													);
													return `${name} ${percent}%`;
												}}
												fill="#fff"
												fontSize={14}
												fontWeight="medium"
											/>
										</Funnel>
									</FunnelChart>
								</ResponsiveContainer>
							</div>

							{/* Bottom insight text */}
							<p className="text-center text-sm text-muted-foreground mt-6">
								Leads increased by 18.2% since last month.
							</p>
						</CardContent>
					</Card>

					{/* Optional: keep or remove the insights card */}
					<Card>
						<CardHeader>
							<CardTitle>Funnel Insights</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								The sales funnel shows the progression of leads through various
								stages. The funnel visualization helps identify bottlenecks and
								optimize conversion rates.
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Pie Chart – Companies by Kundentyp (unchanged for now) */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Companies by Kundentyp</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={pieData}
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={120}
										paddingAngle={5}
										dataKey="value"
									>
										{pieData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.fill} />
										))}
									</Pie>
									<Tooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Kundentyp Insights</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								The pie chart illustrates the distribution of companies by
								customer type. This helps in understanding market segments and
								tailoring strategies accordingly.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
