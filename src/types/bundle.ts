export interface BundleItem {
  id: string;
  bundleId: string;
  productId: string;
  quantity: number;   // How many units of this product are in the bundle
  createdAt?: Date;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  active: boolean;
  hideItemPrices?: boolean;
  overridePrice?: number;
  items?: BundleItem[];
  image?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}
