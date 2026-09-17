export type AppTab = 'Markets' | 'Chart' | 'Trade' | 'Orders' | 'More';

export type MoreDetailKey =
  | 'account'
  | 'portfolio'
  | 'analytics'
  | 'trading-settings'
  | 'notifications'
  | 'appearance'
  | 'security'
  | 'support'
  | 'about';

export type AppScreen =
  | {
      type: 'tab';
      tab: AppTab;
    }
  | {
      type: 'chart';
      instrumentId: string;
    }
  | {
      type: 'trade';
      instrumentId: string;
    }
  | {
      type: 'more-detail';
      detail: MoreDetailKey;
    };

export type NavigationActions = {
  openTab: (tab: AppTab) => void;
  openChart: (instrumentId: string) => void;
  openTrade: (instrumentId: string) => void;
};
