import { prisma } from "@/lib/db";

export async function getIndustryAverage(cylinderSizeKg: number): Promise<number> {
  const avg = await prisma.industryAverage.findUnique({ where: { cylinderSizeKg } });
  return avg?.avgDurationMonths ?? 3;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.round(months * 30.44));
  return result;
}

export async function predictCycle1(
  registrationDate: Date,
  cylinderSizeKg: number,
  clientEstimatedDurationMonths: number | null
): Promise<{ predictedEmptyDate: Date; baselineUsed: string }> {
  if (clientEstimatedDurationMonths !== null) {
    return {
      predictedEmptyDate: addMonths(registrationDate, clientEstimatedDurationMonths),
      baselineUsed: "client_estimate",
    };
  }
  const avg = await getIndustryAverage(cylinderSizeKg);
  return {
    predictedEmptyDate: addMonths(registrationDate, avg),
    baselineUsed: "industry_average",
  };
}

export function predictNextCycle(
  deliveryDate: Date,
  completedCycles: { actualDurationMonths: number | null }[]
): Date {
  const durations = completedCycles
    .map(c => c.actualDurationMonths)
    .filter((d): d is number => d !== null);
  if (durations.length === 0) return addMonths(deliveryDate, 3);
  const rollingAvg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return addMonths(deliveryDate, rollingAvg);
}

export function calcActualDurationMonths(startDate: Date, endDate: Date): number {
  const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return parseFloat((days / 30.44).toFixed(2));
}

// Returns implausibility warning if duration seems off for the cylinder size
export function getDurationWarning(
  cylinderSizeKg: number,
  estimatedMonths: number
): string | null {
  const industryDefaults: Record<number, number> = {
    3: 1, 5: 1.5, 7: 2, 9: 2.5, 14: 4, 19: 5.5, 48: 14,
  };
  const avg = industryDefaults[cylinderSizeKg];
  if (!avg) return null;
  if (estimatedMonths < avg * 0.3) {
    return `That's shorter than typical for a ${cylinderSizeKg}kg cylinder — but if that's your experience, that's fine.`;
  }
  if (estimatedMonths > avg * 3) {
    return `That's longer than typical for a ${cylinderSizeKg}kg cylinder — but if that's your experience, that's fine.`;
  }
  return null;
}
