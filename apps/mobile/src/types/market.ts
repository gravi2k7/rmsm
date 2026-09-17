export type MarketInstrument = {
  id: string;
  symbol: string;
  name: string;
  bid: string;
  ask: string;
  change: string;
  changePercent: string;
  positive: boolean;
};

export const mockMarkets: MarketInstrument[] = [
  {
    id: 'xauusd',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    bid: '3,648.42',
    ask: '3,648.71',
    change: '+18.24',
    changePercent: '+0.50%',
    positive: true,
  },
  {
    id: 'nas100',
    symbol: 'NAS100',
    name: 'Nasdaq 100',
    bid: '24,812.50',
    ask: '24,814.00',
    change: '+126.50',
    changePercent: '+0.51%',
    positive: true,
  },
  {
    id: 'us30',
    symbol: 'US30',
    name: 'Dow Jones',
    bid: '45,218.20',
    ask: '45,221.10',
    change: '-84.30',
    changePercent: '-0.19%',
    positive: false,
  },
  {
    id: 'spx500',
    symbol: 'SPX500',
    name: 'S&P 500',
    bid: '6,612.40',
    ask: '6,613.20',
    change: '+21.70',
    changePercent: '+0.33%',
    positive: true,
  },
];
