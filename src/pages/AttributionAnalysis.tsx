import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  AlertTriangle,
  Database,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import { api } from "@/lib/api";
import { useAttributionData } from "@/hooks/useAttributionData";
import {
  JourneyTimelineTab,
  ChannelContributionTab,
  ModelInsightTab,
  MODEL_INFO,
  CHART_COLORS,
} from "@/components/attribution";
import type {
  AttributionModel,
  AttributionResult,
  AttributionOverview,
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

type TabId = "overview" | "qrcode" | "channel" | "journeys" | "timeline" | "contribution" | "model-insight";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "数据概览", icon: BarChart3 },
  { id: "qrcode", label: "二维码归因", icon: BarChart2 },
  { id: "channel", label: "渠道归因", icon: PieChart },
  { id: "journeys", label: "用户旅程", icon: ListTree },
  { id: "timeline", label: "旅程时间线", icon: Clock },
  { id: "contribution", label: "贡献评估", icon: BarChart3 },
  { id: "model-insight", label: "模型洞察", icon: TrendingUp },
];

function isOverviewEmpty(overview: AttributionOverview): boolean {
  return (
    overview.totalVisitors === 0 &&
    overview.totalScans === 0 &&
    overview.totalConversions === 0
  );
}

function isAttributionEmpty(result: AttributionResult): boolean {
  return (
    result.totalConversions === 0 &&
    result.totalConversionValue === 0 &&
    result.journeys.length === 0
  );
}

export default function AttributionAnalysis() {
  const [compareMode, setCompareMode] = useState(false);
  const [compareResults, setCompareResults] = useState<Record<AttributionModel, AttributionResult> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const initialLoadRef = useRef(false);

  const {
    loading,
    error,
    overview,
    attributionResult,
    channelContributions,
    modelComparison,
    journeyTimeline,
    selectedModel,
    dateRange,
    setSelectedModel,
    setDateRange,
    reloadAll,
    reloadAttribution,
    reloadChannelContributions,
    reloadModelComparison,
    reloadJourneyTimeline,
    clearError,
  } = useAttributionData();

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      reloadAll();
    }
  }, [reloadAll, reloadKey]);

  useEffect(() => {
    if (activeTab === "timeline") {
      if (!journeyTimeline) reloadJourneyTimeline();
    } else if (activeTab === "contribution") {
      if (!channelContributions) reloadChannelContributions();
    } else if (activeTab === "model-insight") {
      if (!modelComparison) reloadModelComparison();
    }
  }, [activeTab, reloadKey, journeyTimeline, channelContributions, modelComparison]);

  const handleModelChange = useCallback((model: AttributionModel) => {
    setSelectedModel(model);
    setShowModelSelector(false);
    clearError();
    reloadAttribution(model);
    if (activeTab === "contribution") {
      reloadChannelContributions(model);
    }
  }, [activeTab, clearError, reloadAttribution, reloadChannelContributions, setSelectedModel]);

  const handleDateChange = useCallback((newRange: { start: string; end: string }) => {
    setDateRange(newRange);
    clearError();
    reloadAttribution(selectedModel, newRange);
    setCompareResults(null);
  }, [clearError, reloadAttribution, selectedModel, setDateRange]);

  const handleRefresh = useCallback(() => {
    clearError();
    setCompareResults(null);
    initialLoadRef.current = false;
    setReloadKey((k) => k + 1);
  }, [clearError]);

  const loadCompareData = useCallback(async () => {
    try {
      const data = await api.compareAttributionModels({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setCompareResults(data);
    } catch (err) {
      console.error("加载对比数据失败", err);
    }
  }, [dateRange]);

  useEffect(() => {
    if (compareMode && !compareResults) {
      loadCompareData();
    }
  }, [compareMode, compareResults, loadCompareData, reloadKey]);

  const overviewEmpty = overview ? isOverviewEmpty(overview) : true;
  const attributionEmpty = attributionResult ? isAttributionEmpty(attributionResult) : true;

  const statCards = useMemo(() => {
    if (!overview || !attributionResult) return [];
    return [
      {
        label: "独立访客数",
        value: overview.totalVisitors.toLocaleString(),
        icon: Users,
        color: "from-brand-500 to-accent-500",
        sub: overviewEmpty ? "暂无访客数据" : `转化率 ${(overview.conversionRate * 100).toFixed(2)}%`,
        zero: overviewEmpty,
      },
      {
        label: "扫码总次数",
        value: overview.totalScans.toLocaleString(),
        icon: MousePointerClick,
        color: "from-accent-500 to-success-500",
        sub: overviewEmpty ? "暂无扫码记录" : `平均旅程 ${overview.avgJourneyLength.toFixed(1)} 步`,
        zero: overviewEmpty,
      },
      {
        label: "转化总次数",
        value: attributionResult.totalConversions.toLocaleString(),
        icon: Target,
        color: "from-warning-500 to-brand-500",
        sub: attributionEmpty ? "暂无转化数据" : `总价值 ¥${attributionResult.totalConversionValue.toLocaleString()}`,
        zero: attributionEmpty,
      },
      {
        label: "平均转化耗时",
        value: overview.avgTimeToConversionMinutes === 0 || overviewEmpty
          ? "-"
          : `${Math.floor(overview.avgTimeToConversionMinutes / 60)}小时${Math.round(overview.avgTimeToConversionMinutes % 60)}分`,
        icon: Clock,
        color: "from-success-500 to-accent-500",
        sub: "从首次触达到转化",
        zero: overview.avgTimeToConversionMinutes === 0 || overviewEmpty,
      },
    ];
  }, [overview, attributionResult, overviewEmpty, attributionEmpty]);

  const channelChartData = useMemo(() => {
    if (!attributionResult || attributionResult.byChannel.length === 0) return null;
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
    if (!attributionResult || attributionResult.byQrCode.length === 0) return null;
    const qrs = attributionResult.byQrCode.slice(0, 8);
    const allZero = qrs.every((q) => q.attributedConversions === 0);
    if (allZero) return null;
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
    if (!attributionResult || attributionResult.byChannel.length === 0) return null;
    const channels = attributionResult.byChannel;
    const allZero = channels.every((c) => c.attributedValue === 0);
    if (allZero) return null;
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
    if (models.length === 0) return null;
    const firstResult = compareResults[models[0]];
    if (!firstResult || firstResult.byChannel.length === 0) return null;
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

  const chartOptions = useMemo(() => ({
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
  }), []);

  const doughnutOptions = useMemo(() => ({
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
            const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : "0";
            return `¥${context.raw.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
    cutout: "65%",
  }), []);

  if (loading && !overview && !attributionResult) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载归因分析数据中...
      </div>
    );
  }

  if (error && !overview && !attributionResult) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <AlertTriangle className="w-8 h-8 text-warning-400 mx-auto mb-3" />
        <p className="mb-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          重试
        </button>
      </div>
    );
  }

  const hasAnyData = overview && attributionResult;
  const hasAnyRecords = overview && (overview.totalVisitors > 0 || overview.totalScans > 0 || overview.totalConversions > 0);

  if (!hasAnyData) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <AlertTriangle className="w-8 h-8 text-warning-400 mx-auto mb-3" />
        <p className="mb-2">暂无归因分析数据</p>
        <p className="text-sm text-dark-500 mb-4">请先创建一些扫码、曝光和转化记录</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          刷新数据
        </button>
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
          {!hasAnyRecords && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning-500/10 border border-warning-500/30 text-warning-400 text-xs">
              <Database className="w-3.5 h-3.5" />
              数据不足：当前只有 {overview?.totalScans || 0} 条扫码
            </div>
          )}
          <div className="flex items-center gap-2 bg-dark-900/60 rounded-lg p-1">
            <button
              onClick={() => { setCompareMode(false); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                !compareMode
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              单模型分析
            </button>
            <button
              onClick={() => { setCompareMode(true); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                compareMode
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              多模型对比
            </button>
          </div>
          <button onClick={handleRefresh} className="btn-secondary" title="刷新数据">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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
                    onClick={() => handleModelChange(model)}
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
                onChange={(e) => handleDateChange({ ...dateRange, start: e.target.value })}
                className="input py-1.5 px-3 text-sm w-auto"
              />
              <span>至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange({ ...dateRange, end: e.target.value })}
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
                  <p className={`text-3xl font-display font-bold mt-2 ${card.zero ? "text-dark-500" : "text-white"}`}>{card.value}</p>
                  <p className="text-dark-500 text-xs mt-2">{card.sub}</p>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-glow-sm ${card.zero ? "opacity-40" : ""}`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-dark-900/60 rounded-lg p-1 w-fit overflow-x-auto max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
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
        attributionEmpty ? (
          <div className="card p-10 text-center">
            <BarChart3 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">暂无归因图表数据</h3>
            <p className="text-dark-400 text-sm mb-4">
              当前有 {overview?.totalScans || 0} 条扫码和 {overview?.totalVisitors || 0} 个访客，
              但尚未产生转化记录。需要积累至少 1 条转化数据才能生成归因分析图表。
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              重新加载
            </button>
          </div>
        ) : (
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
                {channelChartData ? (
                  compareMode && compareChartData ? (
                    <Bar data={compareChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: "top" as const, labels: { color: "#94a3b8", font: { size: 11 } } } } }} />
                  ) : (
                    <Bar data={channelChartData} options={chartOptions} />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-dark-500">
                    暂无渠道价值数据
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-accent-400" />
                渠道贡献占比
              </h3>
              <div className="h-80">
                {doughnutData ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-dark-500">
                    暂无渠道占比数据
                  </div>
                )}
              </div>
            </div>

            {compareMode && compareResults && !attributionEmpty && (
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
                            const total = compareResults[model].totalConversionValue;
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                            return (
                              <td key={model} className="table-cell text-right">
                                <div className={value === 0 ? "text-dark-500" : "text-white"}>¥{value.toLocaleString()}</div>
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
        )
      )}

      {activeTab === "qrcode" && (
        attributionResult.byQrCode.length === 0 ? (
          <div className="card p-10 text-center">
            <BarChart2 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">暂无二维码归因数据</h3>
            <p className="text-dark-400 text-sm mb-4">
              需要有扫码记录并且产生转化后才能分析二维码的归因贡献。
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              重新加载
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                二维码归因转化次数
              </h3>
              <div className="h-80">
                {qrChartData ? (
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
                ) : (
                  <div className="h-full flex items-center justify-center text-dark-500">
                    所有二维码暂无转化记录
                  </div>
                )}
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
                      const isZero = qr.attributedConversions === 0 && qr.attributedValue === 0;
                      return (
                        <tr key={qr.qrcodeId} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-400">
                                {i + 1}
                              </span>
                              <div>
                                <div className={isZero ? "text-dark-400 font-medium" : "text-white font-medium"}>{qr.qrcodeName}</div>
                                <div className="text-xs text-dark-500">{qr.channel || "未设置渠道"}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`table-cell text-right ${isZero ? "text-dark-500" : "text-white"}`}>
                            {qr.attributedConversions.toFixed(1)}
                          </td>
                          <td className={`table-cell text-right font-medium ${isZero ? "text-dark-500" : "text-brand-400"}`}>
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
        )
      )}

      {activeTab === "channel" && (
        attributionResult.byChannel.length === 0 ? (
          <div className="card p-10 text-center">
            <PieChart className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">暂无渠道归因数据</h3>
            <p className="text-dark-400 text-sm mb-4">
              需要先为二维码设置渠道属性，并有扫码和转化记录后才能分析渠道归因。
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              重新加载
            </button>
          </div>
        ) : (
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
                    const isZero = ch.attributedConversions === 0 && ch.attributedValue === 0;
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
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className={isZero ? "text-dark-400 font-medium" : "text-white font-medium"}>{ch.channel}</span>
                          </div>
                        </td>
                        <td className={`table-cell text-right ${isZero ? "text-dark-500" : "text-white"}`}>
                          {ch.attributedConversions.toFixed(1)}
                        </td>
                        <td className={`table-cell text-right font-medium ${isZero ? "text-dark-500" : "text-brand-400"}`}>
                          ¥{ch.attributedValue.toLocaleString()}
                        </td>
                        <td className={`table-cell text-right ${isZero ? "text-dark-500" : "text-dark-300"}`}>
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
        )
      )}

      {activeTab === "journeys" && (
        attributionResult.journeys.length === 0 ? (
          <div className="card p-10 text-center">
            <ListTree className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">暂无用户旅程数据</h3>
            <p className="text-dark-400 text-sm mb-4">
              需要有扫码记录后才能生成用户旅程。当前有 {overview?.totalScans || 0} 条扫码记录，
              {overview?.totalScans ? "但尚未关联到完整的访客旅程信息。" : "请先通过扫码接口产生一些数据。"}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              重新加载
            </button>
          </div>
        ) : (
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
        )
      )}

      {activeTab === "timeline" && (
        <JourneyTimelineTab
          journeyTimeline={journeyTimeline}
          loading={loading}
          onReload={reloadJourneyTimeline}
          standalone={false}
        />
      )}

      {activeTab === "contribution" && (
        <ChannelContributionTab
          channelContributions={channelContributions}
          loading={loading}
          onReload={reloadChannelContributions}
          selectedModel={selectedModel}
          onModelChange={(m) => handleModelChange(m)}
          standalone={false}
        />
      )}

      {activeTab === "model-insight" && (
        <ModelInsightTab
          modelComparison={modelComparison}
          loading={loading}
          onReload={reloadModelComparison}
          standalone={false}
        />
      )}
    </div>
  );
}
