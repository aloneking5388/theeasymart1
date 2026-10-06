// Never serialize seller costs or the tracking URL into public storefront responses.
export function publicProduct<T extends Record<string, any>>(product: T) {
  const { costPrice: _cost, margin: _margin, affiliateLink: _link, ...visible } = product;
  return { ...visible, productType: product.productType ?? "physical" };
}
