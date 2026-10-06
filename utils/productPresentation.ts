export interface ProductPresentation {
  productType?: string;
  price: number;
  currency?: string | null;
}

export const isAffiliateProduct = (product?: { productType?: string } | null) =>
  product?.productType === "affiliate";

export function formatProductPrice(product: ProductPresentation): string {
  if (!isAffiliateProduct(product)) return `₹ ${product.price}`;
  if (!product.currency) return `${product.price} (currency unavailable)`;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: product.currency }).format(product.price);
  } catch {
    return `${product.currency} ${product.price}`;
  }
}
