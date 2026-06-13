import type { AttributionModel } from "@shared/types";

export const MODEL_INFO: Record<AttributionModel, { name: string; description: string; color: string }> = {
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

export const CHART_COLORS = [
  "#1677FF",
  "#52C41A",
  "#FAAD14",
  "#722ED1",
  "#EB2F96",
  "#13C2C2",
  "#F5222D",
  "#2F54EB",
];
