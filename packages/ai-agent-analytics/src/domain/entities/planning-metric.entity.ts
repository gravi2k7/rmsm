/** The "planning metrics" capability's unit of record. */
export interface PlanningMetric {
  readonly plansCreated: number;
  readonly validPlans: number;
  readonly invalidPlans: number;
  readonly replans: number;
}
