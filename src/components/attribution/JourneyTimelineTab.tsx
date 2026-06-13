import {
  Users,
  Target,
  GitBranch,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import type { JourneyTimelineResult, FullJourneyStep } from "@shared/types";

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

export interface JourneyTimelineTabProps {
  journeyTimeline: JourneyTimelineResult | null;
  loading?: boolean;
}

export function JourneyTimelineTab({
  journeyTimeline,
  loading = false,
}: JourneyTimelineTabProps) {
  if (loading && !journeyTimeline) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
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
                  {journey.steps.map((step: FullJourneyStep, i: number) => (
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
