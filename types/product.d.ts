export interface AddProductResponse {
  message: string;
  product: Product;
}

export interface UpdatProduct {
  productId: string;
  name?: string;
  brand?: string;
  price?: number;
  stock?: number;
  discount?: number;
  description?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceRange {
  low: number;
  high: number;
}

export interface ProductState {
  successMessage: string;
  errorMessage: string;
  loader: boolean;
  affiliateLoader: boolean;
  affiliateError: string;
  affiliateProduct: FetchedAffiliateProduct | null;
  products: Product[];
  latest_product: Product[][];
  topRated_product: Product[][];
  discount_product: Product[][];
  relatedProducts: Product[];
  moreProducts: Product[];
  priceRange: PriceRange;
  product: Product | null;
  totalProduct: number;
  parPage: number;
  reviews: Review[];
  totalReview: number;
  totalPages: number;
  currentPage: number;
  rating_review: RatingCount[];
  sellerProducts: Product[];
  totalSellerProduct: number;
}

export interface Product {
  productType?: "physical" | "affiliate";
  currency?: string | null;
  id: string;
  slug: string;
  sellerId: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  discount: number;
  description: string;
  shopName: string;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
  reviews?: Review[];
  rating?: number;
  affiliateLink?: string;
  costPrice?: number;
  margin?: number;
}

export interface QueryParams {
  category?: string;
  rating?: number;
  low?: number;
  high?: number;
  sortPrice?: "low-to-high" | "high-to-low";
  pageNumber?: number;
  searchValue?: string;
}

export interface QueryProductsResponse {
  products: Product[];
  totalProduct: number;
  parPage: number;
}

export interface FetchedAffiliateProduct {
  name: string;
  description: string;
  price: number | null;
  images: string[];
  currency: string | null;
  brand: string;
  originalAffiliateUrl: string;
  importToken: string;
}
