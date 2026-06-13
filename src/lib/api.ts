import type {
  QrCode,
  ScanRecord,
  BatchTask,
  CreateQrCodeRequest,
  UpdateQrCodeRequest,
  BatchGenerateRequest,
  OverviewStats,
  QrCodeStats,
  PagedResult,
  ApiResponse,
  AttributionModel,
  AttributionResult,
  AttributionOverview,
  ConversionEvent,
  CreateConversionRequest,
  JourneyListResult,
  ExposureRecord,
  CreateExposureRequest,
  ChannelContributionResult,
  QrCodeContributionResult,
  ModelComparisonResult,
  JourneyTimelineResult,
} from "@shared/types";

const API_BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(API_BASE + path, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error || json.message || "请求失败");
  }
  return json.data as T;
}

export const api = {
  getOverviewStats(): Promise<OverviewStats> {
    return request<OverviewStats>("/stats/overview");
  },

  listQrCodes(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    type?: string;
    enabled?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<PagedResult<QrCode>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    if (params?.keyword) q.set("keyword", params.keyword);
    if (params?.type) q.set("type", params.type);
    if (params?.enabled !== undefined) q.set("enabled", String(params.enabled));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
    return request<PagedResult<QrCode>>(`/qrcodes${q.toString() ? `?${q.toString()}` : ""}`);
  },

  getQrCode(id: string): Promise<QrCode> {
    return request<QrCode>(`/qrcodes/${id}`);
  },

  createQrCode(data: CreateQrCodeRequest): Promise<QrCode> {
    return request<QrCode>("/qrcodes", { method: "POST", body: JSON.stringify(data) });
  },

  updateQrCode(id: string, data: UpdateQrCodeRequest): Promise<QrCode> {
    return request<QrCode>(`/qrcodes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteQrCode(id: string): Promise<void> {
    return request<void>(`/qrcodes/${id}`, { method: "DELETE" });
  },

  toggleQrCodeEnabled(id: string): Promise<QrCode> {
    return request<QrCode>(`/qrcodes/${id}/toggle`, { method: "POST" });
  },

  downloadQrCode(id: string, format: "png" | "svg" = "png", size?: number): Promise<Blob> {
    const q = new URLSearchParams();
    q.set("format", format);
    if (size) q.set("size", String(size));
    return fetch(`${API_BASE}/qrcodes/${id}/download?${q.toString()}`).then((r) => {
      if (!r.ok) throw new Error("下载失败");
      return r.blob();
    });
  },

  getQrCodeStats(id: string): Promise<QrCodeStats> {
    return request<QrCodeStats>(`/qrcodes/${id}/stats`);
  },

  listScanRecords(qrcodeId: string, params?: { page?: number; pageSize?: number }): Promise<PagedResult<ScanRecord>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<PagedResult<ScanRecord>>(
      `/qrcodes/${qrcodeId}/scans${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  createBatchTask(data: BatchGenerateRequest): Promise<BatchTask> {
    return request<BatchTask>("/batch", { method: "POST", body: JSON.stringify(data) });
  },

  getBatchTask(id: string): Promise<BatchTask> {
    return request<BatchTask>(`/batch/${id}`);
  },

  listBatchTasks(params?: { page?: number; pageSize?: number }): Promise<PagedResult<BatchTask>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<PagedResult<BatchTask>>(`/batch${q.toString() ? `?${q.toString()}` : ""}`);
  },

  downloadBatchZip(taskId: string): Promise<Blob> {
    return fetch(`${API_BASE}/batch/${taskId}/download`).then((r) => {
      if (!r.ok) throw new Error("下载失败");
      return r.blob();
    });
  },

  exportQrCodes(params: { ids: string[]; format: "zip" | "csv" | "scans_csv" | "full" }): Promise<Blob> {
    if (!Array.isArray(params.ids)) {
      throw new Error("ids 必须是数组");
    }
    if (params.ids.length === 0) {
      throw new Error("请至少选择一个二维码");
    }
    return fetch(`${API_BASE}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).then((r) => {
      if (!r.ok) throw new Error("导出失败");
      return r.blob();
    });
  },

  listExportTasks(params?: { page?: number; pageSize?: number }): Promise<PagedResult<BatchTask>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<PagedResult<BatchTask>>(`/export/tasks${q.toString() ? `?${q.toString()}` : ""}`);
  },

  getAttributionOverview(): Promise<AttributionOverview> {
    return request<AttributionOverview>("/attribution/overview");
  },

  analyzeAttribution(params?: {
    model?: AttributionModel;
    startDate?: string;
    endDate?: string;
  }): Promise<AttributionResult> {
    const q = new URLSearchParams();
    if (params?.model) q.set("model", params.model);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<AttributionResult>(`/attribution/analyze${q.toString() ? `?${q.toString()}` : ""}`);
  },

  compareAttributionModels(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Record<AttributionModel, AttributionResult>> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<Record<AttributionModel, AttributionResult>>(
      `/attribution/compare${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  listJourneys(params?: {
    model?: AttributionModel;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<JourneyListResult> {
    const q = new URLSearchParams();
    if (params?.model) q.set("model", params.model);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<JourneyListResult>(`/attribution/journeys${q.toString() ? `?${q.toString()}` : ""}`);
  },

  listConversions(params?: { page?: number; pageSize?: number }): Promise<PagedResult<ConversionEvent>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<PagedResult<ConversionEvent>>(`/attribution/conversions${q.toString() ? `?${q.toString()}` : ""}`);
  },

  createConversion(data: CreateConversionRequest): Promise<ConversionEvent> {
    return request<ConversionEvent>("/attribution/conversions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createExposure(data: CreateExposureRequest): Promise<ExposureRecord> {
    return request<ExposureRecord>("/attribution/exposures", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listExposures(params?: { page?: number; pageSize?: number }): Promise<PagedResult<ExposureRecord>> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<PagedResult<ExposureRecord>>(
      `/attribution/exposures${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  getJourneyTimeline(params?: {
    startDate?: string;
    endDate?: string;
    visitorId?: string;
  }): Promise<JourneyTimelineResult> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    if (params?.visitorId) q.set("visitorId", params.visitorId);
    return request<JourneyTimelineResult>(
      `/attribution/journey-timeline${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  getChannelContributions(params?: {
    model?: AttributionModel;
    startDate?: string;
    endDate?: string;
  }): Promise<ChannelContributionResult> {
    const q = new URLSearchParams();
    if (params?.model) q.set("model", params.model);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<ChannelContributionResult>(
      `/attribution/channel-contributions${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  getQrCodeContributions(params?: {
    model?: AttributionModel;
    startDate?: string;
    endDate?: string;
  }): Promise<QrCodeContributionResult> {
    const q = new URLSearchParams();
    if (params?.model) q.set("model", params.model);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<QrCodeContributionResult>(
      `/attribution/qrcode-contributions${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  getModelComparison(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ModelComparisonResult> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<ModelComparisonResult>(
      `/attribution/model-comparison${q.toString() ? `?${q.toString()}` : ""}`
    );
  },
};
