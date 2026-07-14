import type { CorporateActionType } from "@rmsm/database";

export interface NormalizedCorporateAction {
  providerSymbol: string;
  type: CorporateActionType;
  effectiveDate: Date;
  value: string;
  announcedAt?: Date;
}

export interface CorporateActionProvider {
  fetchCorporateActions(providerSymbol: string, from: Date, to: Date): Promise<NormalizedCorporateAction[]>;
}
