export type AppTab = 'Markets' | 'Chart' | 'Trade' | 'Orders' | 'More';

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
    };

export type NavigationActions = {
  openTab: (tab: AppTab) => void;
  openChart: (instrumentId: string) => void;
  openTrade: (instrumentId: string) => void;
};
