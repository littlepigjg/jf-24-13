import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  Users,
  MousePointerClick,
  Target,
  TrendingUp,
  Clock,
  GitBranch,
  BarChart2,
  PieChart,
  ListTree,
  RefreshCw,
  Calendar,
  Filter,
  ChevronDown,
  CheckCircle2,
  ArrowUpRight,
  XCircle,
  Eye,
  Zap,
  Award,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { api } from "@/lib/api";
import type {
  AttributionModel,
  AttributionResult,
  AttributionOverview,
  UserJourney,
  Touchpoint,
  ChannelContributionResult,
  ModelComparisonResult,
  JourneyTimelineResult,
  FullUserJourney,
  FullJourneyStep,
} from "@shared/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MODEL_INFO: Record<AttributionModel, { name: string; description: string; color: string }> = {
  first_click: {
    name: "首次点击",
    description: "将全部功劳归于用户第一次接触的渠道",
    color: "#1677FF",
  },
  last_click: {
    name: "末次点击",
    description: "将全部功劳归于用户最后一次接触的渠道",
    color: "#52C41A",
  },
  linear: {
    name: "线性归因",
    description: "将功劳平均分配给所有接触点",
    color: "#FAAD14",
  },
  time_decay: {
    name: "时间衰减",
    description: "越接近转化的接触点获得越多功劳",
    color: "#722ED1",
  },
  position_based: {
    name: "位置加权",
    description: "首次和末次各40%，中间触点平分20%",
    color: "#EB2F96",
  },
};

const CHART_COLORS = [
  "#1677FF",
  "#52C41A",
  "#FAAD14",
  "#722ED1",
  "#EB2F96",
  "#13C2C2",
  "#F5222D",
  "#2F54EB",
];

const mockOverview: AttributionOverview = {
  totalVisitors: 1250,
  totalScans: 3420,
  totalConversions: 186,
  totalConversionValue: 93500,
  conversionRate: 0.1488,
  avgJourneyLength: 2.3,
  avgTimeToConversionMinutes: 142.5,
};

function generateMockJourneys(): UserJourney[] {
  const channels = ["微信公众号", "抖音推广", "线下门店", "官网Banner", "邮件营销", "小红书"];
  const qrNames = [
    "微信关注二维码",
    "抖音活动码",
    "门店海报码",
    "官网首页码",
    "邮件推广码",
    "小红书种草码",
  ];
  const journeys: UserJourney[] = [];

  for (let i = 0; i < 15; i++) {
    const visitorId = `visitor-${i + 1}`;
    const touchpointCount = Math.floor(Math.random() * 4) + 1;
    const touchpoints: Touchpoint[] = [];
    const baseTime = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000;

    for (let j = 0; j < touchpointCount; j++) {
      const idx = Math.floor(Math.random() * channels.length);
      touchpoints.push({
        scanId: `scan-${i}-${j}`,
        qrcodeId: `qr-${idx}`,
        shortCode: `code-${idx}`,
        qrcodeName: qrNames[idx],
        channel: channels[idx],
        timestamp: new Date(baseTime + j * (Math.random() * 3600000 + 60000)).toISOString(),
        position: j,
        weight: 0,
      });
    }

    const hasConversion = Math.random() > 0.3;
    const conversionTime = hasConversion
      ? new Date(baseTime + touchpointCount * 3600000 + Math.random() * 86400000).toISOString()
      : undefined;

    journeys.push({
      visitorId,
      touchpoints,
      firstTouchAt: touchpoints[0]?.timestamp,
      lastTouchAt: touchpoints[touchpoints.length - 1]?.timestamp,
      ...(hasConversion && {
        conversion: {
          id: `conv-${i}`,
          visitorId,
          eventType: Math.random() > 0.5 ? "purchase" : "register",
          eventValue: Math.floor(Math.random() * 1000) + 50,
          timestamp: conversionTime!,
        },
        conversionAt: conversionTime!,
        timeToConversionSeconds: Math.floor((new Date(conversionTime!).getTime() - baseTime) / 1000),
      }),
    });
  }

  return journeys;
}

const mockResult: AttributionResult = {
  model: "last_click",
  totalConversions: 186,
  totalConversionValue: 93500,
  byQrCode: [
    {
      qrcodeId: "qr-1",
      qrcodeName: "微信关注二维码",
      shortCode: "wechat",
      channel: "微信公众号",
      attributedConversions: 58,
      attributedValue: 29200,
      weightSum: 58,
    },
    {
      qrcodeId: "qr-2",
      qrcodeName: "抖音活动码",
      shortCode: "douyin",
      channel: "抖音推广",
      attributedConversions: 45,
      attributedValue: 22500,
      weightSum: 45,
    },
    {
      qrcodeId: "qr-3",
      qrcodeName: "门店海报码",
      shortCode: "store",
      channel: "线下门店",
      attributedConversions: 38,
      attributedValue: 19000,
      weightSum: 38,
    },
    {
      qrcodeId: "qr-4",
      qrcodeName: "官网首页码",
      shortCode: "homepage",
      channel: "官网Banner",
      attributedConversions: 25,
      attributedValue: 12500,
      weightSum: 25,
    },
    {
      qrcodeId: "qr-5",
      qrcodeName: "邮件推广码",
      shortCode: "email",
      channel: "邮件营销",
      attributedConversions: 20,
      attributedValue: 10300,
      weightSum: 20,
    },
  ],
  byChannel: [
    {
      channel: "微信公众号",
      attributedConversions: 58,
      attributedValue: 29200,
      weightSum: 58,
    },
    {
      channel: "抖音推广",
      attributedConversions: 45,
      attributedValue: 22500,
      weightSum: 45,
    },
    {
      channel: "线下门店",
      attributedConversions: 38,
      attributedValue: 19000,
      weightSum: 38,
    },
    {
      channel: "官网Banner",
      attributedConversions: 25,
      attributedValue: 12500,
      weightSum: 25,
    },
    {
      channel: "邮件营销",
      attributedConversions: 20,
      attributedValue: 10300,
      weightSum: 20,
    },
  ],
  journeys: generateMockJourneys(),
};

export default function AttributionAnalysis() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AttributionOverview>(mockOverview);
  const [selectedModel, setSelectedModel] = useState<AttributionModel>("last_click");
  const [attributionResult, setAttributionResult] = useState<AttributionResult>(mockResult);
  const [compareMode, setCompareMode] = useState(false);
  const [compareResults, setCompareResults] = useState<Record<AttributionModel, AttributionResult> | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "qrcode" | "channel" | "journeys" | "timeline" | "contribution" | "model-insight">("overview");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [channelContributions, setChannelContributions] = useState<ChannelContributionResult | null>(null);
  const [modelComparison, setModelComparison] = useState<ModelComparisonResult | null>(null);
  const [journeyTimeline, setJourneyTimeline] = useState<JourneyTimelineResult | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedModel, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, resultData] = await Promise.all([
        api.getAttributionOverview().catch(() => mockOverview),
        api.analyzeAttribution({ model: selectedModel, ...dateRange }).catch(() => mockResult),
      ]);
      setOverview(overviewData);
      setAttributionResult(resultData);
    } catch (err) {
      console.error("加载归因数据失败", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompareData = async () => {
    setLoading(true);
    try {
      const data = await api.compareAttributionModels({ startDate: dateRange.start, endDate: dateRange.end }).catch(() => {
        const result: Record<string, AttributionResult> = {};
        Object.keys(MODEL_INFO).forEach((key) => {
          result[key] = { ...mockResult, model: key as AttributionModel };
        });
        return result as Record<AttributionModel, AttributionResult>;
      });
      setCompareResults(data);
    } catch (err) {
      console.error("加载对比数据失败", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (compareMode && !compareResults) {
      loadCompareData();
    }
  }, [compareMode]);

  const statCards = [
    {
      label: "独立访客数",
      value: overview.totalVisitors.toLocaleString(),
      icon: Users,
      color: "from-brand-500 to-accent-500",
      sub: `转化率 ${(overview.conversionRate * 100).toFixed(2)}%`,
    },
    {
      label: "扫码总次数",
      value: overview.totalScans.toLocaleString(),
      icon: MousePointerClick,
      color: "from-accent-500 to-success-500",
      sub: `平均旅程 ${overview.avgJourneyLength.toFixed(1)} 步`,
    },
    {
      label: "转化总次数",
      value: attributionResult.totalConversions.toLocaleString(),
      icon: Target,
      color: "from-warning-500 to-brand-500",
      sub: `总价值 ¥${attributionResult.totalConversionValue.toLocaleString()}`,
    },
    {
      label: "平均转化耗时",
      value: `${Math.round(overview.avgTimeToConversionMinutes / 60)}小时${Math.round(overview.avgTimeToConversionMinutes % 60)}分`,
      icon: Clock,
      color: "from-success-500 to-accent-500",
      sub: "从首次触达到转化",
    },
  ];

  const channelChartData = useMemo(() => {
    const channels = attributionResult.byChannel.map((c) => c.channel);
    return {
      labels: channels,
      datasets: [
        {
          label: "归因转化价值",
          data: attributionResult.byChannel.map((c) => c.attributedValue),
          backgroundColor: channels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + "CC"),
          borderColor: channels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  }, [attributionResult]);

  const qrChartData = useMemo(() => {
    const qrs = attributionResult.byQrCode.slice(0, 8);
    return {
      labels: qrs.map((q) => q.qrcodeName),
      datasets: [
        {
          label: "归因转化次数",
          data: qrs.map((q) => q.attributedConversions),
          backgroundColor: "rgba(22, 119, 255, 0.7)",
          borderColor: "#1677FF",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  }, [attributionResult]);

  const doughnutData = useMemo(() => {
    const channels = attributionResult.byChannel;
    return {
      labels: channels.map((c) => c.channel),
      datasets: [
        {
          data: channels.map((c) => c.attributedValue),
          backgroundColor: channels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: "#0f172a",
          borderWidth: 3,
        },
      ],
    };
  }, [attributionResult]);

  const compareChartData = useMemo(() => {
    if (!compareResults) return null;
    const models = Object.keys(compareResults) as AttributionModel[];
    const firstResult = compareResults[models[0]];
    const channels = firstResult.byChannel.map((c) => c.channel);

    return {
      labels: channels,
      datasets: models.map((model, i) => ({
        label: MODEL_INFO[model].name,
        data: compareResults[model].byChannel.map((c) => c.attributedValue),
        backgroundColor: MODEL_INFO[model].color + "99",
        borderColor: MODEL_INFO[model].color,
        borderWidth: 2,
        borderRadius: 6,
      })),
    };
  }, [compareResults]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        borderWidth: 1,
        titleColor: "#e2e8f0",
        bodyColor: "#cbd5e1",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `¥${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: { color: "#64748b", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (v: any) => `¥${(v / 1000).toFixed(0)}k`,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "#94a3b8",
          font: { size: 11 },
          padding: 12,
          generateLabels: (chart: any) => {
            const data = chart.data;
            return data.labels.map((label: string, i: number) => ({
              text: `${label} (¥${data.datasets[0].data[i].toLocaleString()})`,
              fillStyle: data.datasets[0].backgroundColor[i],
              strokeStyle: data.datasets[0].backgroundColor[i],
              lineWidth: 0,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        borderWidth: 1,
        titleColor: "#e2e8f0",
        bodyColor: "#cbd5e1",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = ((context.raw / total) * 100).toFixed(1);
            return `¥${context.raw.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
    cutout: "65%",
  };

  const tabs = [
    { id: "overview", label: "数据概览", icon: BarChart3 },
    { id: "qrcode", label: "二维码归因", icon: BarChart2 },
    { id: "channel", label: "渠道归因", icon: PieChart },
    { id: "journeys", label: "用户旅程", icon: ListTree },
    { id: "timeline", label: "旅程时间线", icon: Clock },
    { id: "contribution", label: "贡献评估", icon: Award },
    { id: "model-insight", label: "模型洞察", icon: Lightbulb },
  ];

  if (loading) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载归因分析数据中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <GitBranch className="w-7 h-7 text-brand-400" />
            多触点归因分析
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            追踪用户从首次曝光到最终转化的完整旅程，评估不同渠道和二维码的真实贡献价值
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-900/60 rounded-lg p-1">
            <button
              onClick={() => setCompareMode(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                !compareMode
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              单模型分析
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                compareMode
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              多模型对比
            </button>
          </div>
          <button onClick={loadData} className="btn-secondary" title="刷新数据">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {!compareMode && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="btn-primary flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: MODEL_INFO[selectedModel].color }}
              />
              {MODEL_INFO[selectedModel].name}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showModelSelector && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-dark-700/50 transition-colors text-left ${
                      selectedModel === model ? "bg-dark-700/30" : ""
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: MODEL_INFO[model].color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{MODEL_INFO[model].name}</span>
                        {selectedModel === model && (
                          <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-dark-400 mt-1">{MODEL_INFO[model].description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input py-1.5 px-3 text-sm w-auto"
              />
              <span>至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input py-1.5 px-3 text-sm w-auto"
              />
            </div>
            <button className="btn-ghost">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="stat-card animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm">{card.label}</p>
                  <p className="text-3xl font-display font-bold text-white mt-2">{card.value}</p>
                  <p className="text-dark-500 text-xs mt-2">{card.sub}</p>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-glow-sm`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-dark-900/60 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-brand-gradient text-white shadow-glow-sm"
                : "text-dark-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                {compareMode ? "各模型渠道归因价值对比" : "渠道归因价值分布"}
              </h3>
              <span className="tag-blue flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                按价值排序
              </span>
            </div>
            <div className="h-80">
              {compareMode && compareChartData ? (
                <Bar data={compareChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: "top" as const, labels: { color: "#94a3b8", font: { size: 11 } } } } }} />
              ) : (
                <Bar data={channelChartData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-accent-400" />
              渠道贡献占比
            </h3>
            <div className="h-80">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>

          {compareMode && compareResults && (
            <div className="lg:col-span-3 card p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-brand-400" />
                多模型归因结果对比
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="table-head text-left">渠道</th>
                      {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => (
                        <th key={model} className="table-head text-right">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: MODEL_INFO[model].color }}
                          />
                          {MODEL_INFO[model].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareResults.first_click.byChannel.map((channel, idx) => (
                      <tr key={channel.channel} className="table-row">
                        <td className="table-cell text-white font-medium">{channel.channel}</td>
                        {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => {
                          const value = compareResults[model].byChannel[idx]?.attributedValue || 0;
                          const pct = ((value / compareResults[model].totalConversionValue) * 100).toFixed(1);
                          return (
                            <td key={model} className="table-cell text-right">
                              <div className="text-white">¥{value.toLocaleString()}</div>
                              <div className="text-xs text-dark-500">{pct}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "qrcode" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-brand-400" />
              二维码归因转化次数
            </h3>
            <div className="h-80">
              <Bar
                data={qrChartData}
                options={{
                  ...chartOptions,
                  indexAxis: "y" as const,
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.y,
                      ticks: { color: "#64748b", font: { size: 11 } },
                    },
                    y: {
                      ...chartOptions.scales.x,
                      ticks: { color: "#64748b", font: { size: 11 } },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-700">
              <h3 className="font-semibold text-white">二维码归因明细</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-900/40">
                  <tr>
                    <th className="table-head text-left">二维码名称</th>
                    <th className="table-head text-right">归因转化</th>
                    <th className="table-head text-right">归因价值</th>
                    <th className="table-head text-right">权重占比</th>
                  </tr>
                </thead>
                <tbody>
                  {attributionResult.byQrCode.map((qr, i) => {
                    const pct = attributionResult.totalConversionValue > 0
                      ? ((qr.attributedValue / attributionResult.totalConversionValue) * 100).toFixed(1)
                      : "0";
                    return (
                      <tr key={qr.qrcodeId} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-400">
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-white font-medium">{qr.qrcodeName}</div>
                              <div className="text-xs text-dark-500">{qr.channel || "未设置渠道"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-right text-white">
                          {qr.attributedConversions.toFixed(1)}
                        </td>
                        <td className="table-cell text-right text-brand-400 font-medium">
                          ¥{qr.attributedValue.toLocaleString()}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-gradient rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-dark-400 text-sm w-12 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "channel" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-accent-400" />
              渠道归因明细
            </h3>
            <span className="tag-gray">共 {attributionResult.byChannel.length} 个渠道</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/40">
                <tr>
                  <th className="table-head text-left">排名</th>
                  <th className="table-head text-left">渠道名称</th>
                  <th className="table-head text-right">归因转化次数</th>
                  <th className="table-head text-right">归因转化价值</th>
                  <th className="table-head text-right">平均每次价值</th>
                  <th className="table-head text-right">占比</th>
                </tr>
              </thead>
              <tbody>
                {attributionResult.byChannel.map((ch, i) => {
                  const avgValue = ch.attributedConversions > 0 ? ch.attributedValue / ch.attributedConversions : 0;
                  const pct = attributionResult.totalConversionValue > 0
                    ? ((ch.attributedValue / attributionResult.totalConversionValue) * 100).toFixed(1)
                    : "0";
                  return (
                    <tr key={ch.channel} className="table-row">
                      <td className="table-cell">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                            i === 0
                              ? "bg-gradient-to-br from-warning-500 to-brand-500 text-white"
                              : i === 1
                              ? "bg-gradient-to-br from-dark-400 to-dark-500 text-white"
                              : i === 2
                              ? "bg-gradient-to-br from-warning-600 to-warning-500 text-white"
                              : "bg-dark-700 text-dark-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="table-cell text-white font-medium">{ch.channel}</td>
                      <td className="table-cell text-right text-white">
                        {ch.attributedConversions.toFixed(1)}
                      </td>
                      <td className="table-cell text-right text-brand-400 font-medium">
                        ¥{ch.attributedValue.toLocaleString()}
                      </td>
                      <td className="table-cell text-right text-dark-300">
                        ¥{avgValue.toFixed(0)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-dark-400 text-sm w-12 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "journeys" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ListTree className="w-4 h-4 text-brand-400" />
                用户旅程详情
              </h3>
              <span className="tag-gray">
                显示 {attributionResult.journeys.filter((j) => j.conversion).length} 条已转化 /{" "}
                {attributionResult.journeys.length} 条总旅程
              </span>
            </div>
            <div className="divide-y divide-dark-700">
              {attributionResult.journeys.map((journey) => (
                <div key={journey.visitorId} className="p-5 hover:bg-dark-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white font-bold text-sm">
                        {journey.visitorId.slice(-2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            访客 {journey.visitorId.slice(0, 8)}...
                          </span>
                          {journey.conversion ? (
                            <span className="tag-green flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              已转化
                            </span>
                          ) : (
                            <span className="tag-gray flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              未转化
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-dark-500 mt-1 flex items-center gap-3">
                          <span>{journey.touchpoints.length} 个触点</span>
                          {journey.timeToConversionSeconds !== undefined && (
                            <span>
                              转化耗时: {Math.round(journey.timeToConversionSeconds / 60)} 分钟
                            </span>
                          )}
                          {journey.conversion && (
                            <span className="text-brand-400">
                              价值: ¥{journey.conversion.eventValue?.toLocaleString() || "1"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {journey.conversion && (
                      <span className="text-sm text-dark-400">
                        转化: {journey.conversion.eventType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {journey.touchpoints.map((tp, i) => (
                      <div key={tp.scanId} className="flex items-center">
                        <div className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="text-dark-300">{tp.channel || tp.qrcodeName}</span>
                            {tp.weight > 0 && (
                              <span className="text-brand-400 font-medium">
                                {(tp.weight * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-dark-500 mt-0.5">
                            {new Date(tp.timestamp).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        {i < journey.touchpoints.length - 1 && (
                          <ArrowUpRight className="w-4 h-4 text-dark-600 mx-1 rotate-45" />
                        )}
                      </div>
                    ))}
                    {journey.conversion && (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-success-500 mx-1 rotate-45" />
                        <div className="px-3 py-1.5 rounded-lg bg-success-500/10 border border-success-500/30 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success-500" />
                            <span className="text-success-400 font-medium">转化完成</span>
                          </div>
                          <div className="text-xs text-dark-500 mt-0.5">
                            {new Date(journey.conversion.timestamp).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <JourneyTimelineTab
          dateRange={dateRange}
          journeyTimeline={journeyTimeline}
          setJourneyTimeline={setJourneyTimeline}
        />
      )}

      {activeTab === "contribution" && (
        <ChannelContributionTab
          selectedModel={selectedModel}
          dateRange={dateRange}
          channelContributions={channelContributions}
          setChannelContributions={setChannelContributions}
        />
      )}

      {activeTab === "model-insight" && (
        <ModelInsightTab
          dateRange={dateRange}
          modelComparison={modelComparison}
          setModelComparison={setModelComparison}
        />
      )}
    </div>
  );
}

function StepIcon({ stepType }: { stepType: string }) {
  switch (stepType) {
    case "exposure":
      return <Eye className="w-4 h-4 text-accent-400" />;
    case "scan":
      return <MousePointerClick className="w-4 h-4 text-brand-400" />;
    case "conversion":
      return <Target className="w-4 h-4 text-success-400" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-dark-600" />;
  }
}

function StepBadge({ stepType }: { stepType: string }) {
  switch (stepType) {
    case "exposure":
      return <span className="tag-blue text-xs">曝光</span>;
    case "scan":
      return <span className="tag-blue text-xs">扫码</span>;
    case "conversion":
      return <span className="tag-green text-xs">转化</span>;
    default:
      return null;
  }
}

function JourneyTimelineTab({
  dateRange,
  journeyTimeline,
  setJourneyTimeline,
}: {
  dateRange: { start: string; end: string };
  journeyTimeline: JourneyTimelineResult | null;
  setJourneyTimeline: (v: JourneyTimelineResult | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, [dateRange]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await api.getJourneyTimeline({ startDate: dateRange.start, endDate: dateRange.end });
      setJourneyTimeline(data);
    } catch {
      setJourneyTimeline(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !journeyTimeline) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载旅程时间线数据中...
      </div>
    );
  }

  if (!journeyTimeline) {
    return (
      <div className="card p-12 text-center text-dark-400">
        暂无旅程时间线数据
      </div>
    );
  }

  const summaryCards = [
    { label: "总旅程数", value: journeyTimeline.totalJourneys, icon: Users, color: "from-brand-500 to-accent-500" },
    { label: "已转化旅程", value: journeyTimeline.convertedJourneys, icon: Target, color: "from-success-500 to-accent-500" },
    { label: "平均转化步骤", value: journeyTimeline.avgStepsToConversion.toFixed(1), icon: GitBranch, color: "from-warning-500 to-brand-500" },
    { label: "平均曝光次数", value: journeyTimeline.avgExposuresBeforeConversion.toFixed(1), icon: Eye, color: "from-accent-500 to-success-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="stat-card animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm">{card.label}</p>
                  <p className="text-2xl font-display font-bold text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-glow-sm`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {journeyTimeline.commonPatterns.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-brand-400" />
            常见旅程模式
          </h3>
          <div className="space-y-3">
            {journeyTimeline.commonPatterns.map((pattern, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-400">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pattern.pattern.map((ch, j) => (
                      <span key={j} className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-dark-700 text-xs text-dark-300">{ch}</span>
                        {j < pattern.pattern.length - 1 && <ArrowRight className="w-3 h-3 text-dark-600" />}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white text-sm font-medium">{pattern.occurrences} 次</div>
                  <div className="text-dark-500 text-xs">转化率 {(pattern.conversionRate * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            完整旅程时间线
          </h3>
        </div>
        <div className="divide-y divide-dark-700">
          {journeyTimeline.journeys.map((journey) => (
            <div key={journey.visitorId} className="p-5 hover:bg-dark-800/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white font-bold text-sm">
                    {journey.visitorId.slice(-2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">访客 {journey.visitorId.slice(0, 8)}...</span>
                      {journey.conversion ? (
                        <span className="tag-green flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          已转化
                        </span>
                      ) : (
                        <span className="tag-gray flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          未转化
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-dark-500 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {journey.totalExposures} 曝光</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {journey.totalScans} 扫码</span>
                      {journey.journeyDurationMinutes !== undefined && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {journey.journeyDurationMinutes} 分钟</span>
                      )}
                      {journey.conversion && (
                        <span className="text-brand-400">价值: ¥{journey.conversion.eventValue?.toLocaleString() || "1"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative ml-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-dark-700" />
                <div className="space-y-3">
                  {journey.steps.map((step, i) => (
                    <div key={step.id} className="flex items-start gap-3 relative">
                      <div className="w-4 h-4 rounded-full bg-dark-800 border-2 border-dark-600 flex items-center justify-center z-10 mt-0.5 flex-shrink-0"
                        style={{
                          borderColor: step.stepType === "conversion" ? "#52C41A" : step.stepType === "scan" ? "#1677FF" : "#FAAD14",
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: step.stepType === "conversion" ? "#52C41A" : step.stepType === "scan" ? "#1677FF" : "#FAAD14",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <StepIcon stepType={step.stepType} />
                          <StepBadge stepType={step.stepType} />
                          <span className="text-white text-sm font-medium">
                            {step.stepType === "conversion"
                              ? step.eventType
                              : step.channel || step.qrcodeName || "未知"}
                          </span>
                          {step.stepType === "exposure" && step.exposureType && (
                            <span className="text-xs text-dark-500">({step.exposureType})</span>
                          )}
                        </div>
                        <div className="text-xs text-dark-500 mt-0.5">
                          {new Date(step.timestamp).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                          {step.stepType === "conversion" && step.eventValue && (
                            <span className="ml-2 text-brand-400">¥{step.eventValue.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelContributionTab({
  selectedModel,
  dateRange,
  channelContributions,
  setChannelContributions,
}: {
  selectedModel: AttributionModel;
  dateRange: { start: string; end: string };
  channelContributions: ChannelContributionResult | null;
  setChannelContributions: (v: ChannelContributionResult | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContributions();
  }, [selectedModel, dateRange]);

  const loadContributions = async () => {
    setLoading(true);
    try {
      const data = await api.getChannelContributions({ model: selectedModel, ...dateRange });
      setChannelContributions(data);
    } catch {
      setChannelContributions(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !channelContributions) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载渠道贡献评估数据中...
      </div>
    );
  }

  if (!channelContributions) {
    return (
      <div className="card p-12 text-center text-dark-400">
        暂无渠道贡献数据
      </div>
    );
  }

  const maxScore = Math.max(...channelContributions.contributions.map((c) => c.contributionScore), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均贡献分</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {channelContributions.benchmarks.avgContributionScore}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均转化率</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {(channelContributions.benchmarks.avgConversionRate * 100).toFixed(2)}%
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均归因价值</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              ¥{channelContributions.benchmarks.avgAttributedValue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-400" />
            渠道贡献评估
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-900/40">
              <tr>
                <th className="table-head text-left">排名</th>
                <th className="table-head text-left">渠道</th>
                <th className="table-head text-right">曝光</th>
                <th className="table-head text-right">扫码</th>
                <th className="table-head text-right">独立访客</th>
                <th className="table-head text-right">首次点击</th>
                <th className="table-head text-right">末次点击</th>
                <th className="table-head text-right">辅助转化</th>
                <th className="table-head text-right">归因价值</th>
                <th className="table-head text-right">转化率</th>
                <th className="table-head text-right">贡献分</th>
              </tr>
            </thead>
            <tbody>
              {channelContributions.contributions.map((ch, i) => (
                <tr key={ch.channel} className="table-row">
                  <td className="table-cell">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-gradient-to-br from-warning-500 to-brand-500 text-white"
                        : i === 1 ? "bg-gradient-to-br from-dark-400 to-dark-500 text-white"
                        : i === 2 ? "bg-gradient-to-br from-warning-600 to-warning-500 text-white"
                        : "bg-dark-700 text-dark-400"
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-cell text-white font-medium">{ch.channel}</td>
                  <td className="table-cell text-right text-dark-300">{ch.totalExposures}</td>
                  <td className="table-cell text-right text-dark-300">{ch.totalScans}</td>
                  <td className="table-cell text-right text-dark-300">{ch.uniqueVisitors}</td>
                  <td className="table-cell text-right text-accent-400">{ch.firstClickConversions}</td>
                  <td className="table-cell text-right text-brand-400">{ch.lastClickConversions}</td>
                  <td className="table-cell text-right text-warning-400">{ch.assistedConversions}</td>
                  <td className="table-cell text-right text-brand-400 font-medium">¥{ch.attributedValue.toLocaleString()}</td>
                  <td className="table-cell text-right text-dark-300">{(ch.conversionRate * 100).toFixed(2)}%</td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-gradient rounded-full"
                          style={{ width: `${(ch.contributionScore / maxScore) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-medium text-sm w-14 text-right">{ch.contributionScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {channelContributions.channelSynergies.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-warning-400" />
            渠道协同效应
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelContributions.channelSynergies.slice(0, 9).map((synergy, i) => (
              <div key={i} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{synergy.channelA}</span>
                    <span className="text-dark-500">×</span>
                    <span className="text-white text-sm font-medium">{synergy.channelB}</span>
                  </div>
                  <span className="text-warning-400 font-bold">{(synergy.synergyScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>联合转化: {synergy.jointConversions}</span>
                  <span>联合价值: ¥{synergy.jointValue.toLocaleString()}</span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-warning-500 to-brand-500 rounded-full"
                    style={{ width: `${synergy.synergyScore * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelInsightTab({
  dateRange,
  modelComparison,
  setModelComparison,
}: {
  dateRange: { start: string; end: string };
  modelComparison: ModelComparisonResult | null;
  setModelComparison: (v: ModelComparisonResult | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComparison();
  }, [dateRange]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const data = await api.getModelComparison({ startDate: dateRange.start, endDate: dateRange.end });
      setModelComparison(data);
    } catch {
      setModelComparison(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !modelComparison) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载模型洞察数据中...
      </div>
    );
  }

  if (!modelComparison) {
    return (
      <div className="card p-12 text-center text-dark-400">
        暂无模型洞察数据
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">模型一致性</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {(modelComparison.modelAgreement * 100).toFixed(0)}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-dark-500 text-xs mt-2">
              {modelComparison.modelAgreement > 0.8 ? "各模型高度一致" : modelComparison.modelAgreement > 0.5 ? "模型间存在一定差异" : "模型间差异显著"}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">推荐模型</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {MODEL_INFO[modelComparison.recommendedModel].name}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-accent-500 flex items-center justify-center shadow-glow-sm">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-dark-500 text-xs mt-2">{modelComparison.recommendationReason}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">争议渠道数</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {modelComparison.controversialChannels.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning-500 to-brand-500 flex items-center justify-center shadow-glow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-dark-500 text-xs mt-2">
              {modelComparison.controversialChannels.length > 0
                ? `争议渠道: ${modelComparison.controversialChannels.join("、")}`
                : "无争议渠道，各模型结果一致"}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning-400" />
            各渠道模型归因对比
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-900/40">
              <tr>
                <th className="table-head text-left">渠道</th>
                <th className="table-head text-left">共识排名</th>
                {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => (
                  <th key={model} className="table-head text-right">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: MODEL_INFO[model].color }}
                    />
                    {MODEL_INFO[model].name}
                  </th>
                ))}
                <th className="table-head text-right">方差</th>
              </tr>
            </thead>
            <tbody>
              {modelComparison.summaries.map((summary) => (
                <tr key={summary.channel} className="table-row">
                  <td className="table-cell text-white font-medium">{summary.channel}</td>
                  <td className="table-cell">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-dark-700 text-dark-400">
                      {summary.consensusRank}
                    </span>
                  </td>
                  {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => {
                    const data = summary.models[model];
                    return (
                      <td key={model} className="table-cell text-right">
                        <div className="text-white text-sm">¥{data.attributedValue.toLocaleString()}</div>
                        <div className="text-xs text-dark-500">{data.percentage.toFixed(1)}%</div>
                      </td>
                    );
                  })}
                  <td className="table-cell text-right">
                    <span className={`text-sm font-medium ${
                      summary.varianceScore > 0.5 ? "text-warning-400" : summary.varianceScore > 0.3 ? "text-accent-400" : "text-success-400"
                    }`}>
                      {(summary.varianceScore * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-400" />
          归因模型说明
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(MODEL_INFO) as [AttributionModel, { name: string; description: string; color: string }][]).map(([key, info]) => (
            <div key={key}
              className={`p-4 rounded-xl border transition-colors ${
                modelComparison.recommendedModel === key
                  ? "bg-brand-500/10 border-brand-500/30"
                  : "bg-dark-800/50 border-dark-700 hover:border-dark-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="text-white font-medium text-sm">{info.name}</span>
                {modelComparison.recommendedModel === key && (
                  <span className="tag-green text-xs ml-auto flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    推荐
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-xs leading-relaxed">{info.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
