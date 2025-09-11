export interface Portfolio {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface Asset {
    id: string;
    asset_class: string;
    currency: string;
}

export interface Transaction {
    portfolio_id: string;
    asset_id: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    assets: Asset;
}

export interface AssetValuation {
    asset_id: string;
    date: string;
    value: number;
}

export interface ConversionRate {
  base_currency: string;
  target_currency: string;
  rate: number;
}
