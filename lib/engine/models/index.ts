import "server-only";
import type { DrawDate, FormulaModelId, HistoricalDraw, MatrixResult, ModelInfo } from "@/lib/types";
import HISTORICAL from "@/lib/data/historical.json";
import { calculateHybridMatrix } from "../index";
import { calculateAdaptiveFrequency } from "./adaptiveFrequency";
import { calculateStatisticalBoost } from "./statisticalBoost";

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "hybrid-matrix",
    name: "Hybrid Matrix (สูตรมาตรฐาน)",
    description: "สมการคงที่สากล (Golden Ratio φ³ × π × e) ร่วมกับแรงดึงดูดทางสถิติ (Statistical Tension)",
    badge: "Deterministic φ³",
  },
  {
    id: "adaptive-frequency",
    name: "Adaptive Frequency (สูตรสถิติปรับจูน)",
    description: "โมเดลความถี่ถ่วงน้ำหนักตามกาลเวลา (Time-Decay Recency) และความน่าจะเป็นของคู่ตัวเลข",
    badge: "Tuned Frequency",
  },
  {
    id: "statistical-boost",
    name: "Statistical Boost (สูตรเร่งพลังสถิติ)",
    description: "Ensemble 3 สัญญาณ: Markov Transition + Gap Pressure + Exponential Recency พร้อมชุดผู้ท้าชิงอีก 9 ชุด และชุดเลขท้าย 2 ตัวพร้อมเลขกลับ",
    badge: "Ensemble ×10",
  },
];

export function calculateWithModel(
  modelId: FormulaModelId = "hybrid-matrix",
  targetDate: DrawDate,
  draws: HistoricalDraw[] = HISTORICAL,
): MatrixResult {
  if (modelId === "adaptive-frequency") {
    return calculateAdaptiveFrequency(targetDate, draws);
  }

  if (modelId === "statistical-boost") {
    return calculateStatisticalBoost(targetDate, draws);
  }

  // default: hybrid-matrix
  const res = calculateHybridMatrix(targetDate);
  return {
    ...res,
    modelId: "hybrid-matrix",
  };
}

