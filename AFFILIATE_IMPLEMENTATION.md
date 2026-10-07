# EasyMart affiliate implementation report

Implementation and verification date: 6 October 2026.

## Architecture

Product now supports `physical | affiliate`, with a schema default of `physical`. All runtime branches treat a missing type as physical, so existing records need no migration. An old record with an affiliateLink but no productType remains physical; it is not automatically converted.

Physical products retain EasyMart's manual creation, pricing, stock, cart, shipping, order and payment paths. Affiliate products use merchant metadata and an original seller-owned tracking URL. They have no EasyMart stock-based purchasing controls or margin-derived merchant price. The merchant handles checkout, payment and delivery.

The existing authenticated seller creation page supports both types. Successful imports return metadata and a signed, seller-bound receipt valid for one hour. Publishing verifies that receipt and uses its available merchant fields instead of trusting edited form values. Missing required metadata can be explicitly supplied by the seller; currency remains unavailable when the source did not provide it. Category is selected in EasyMart. Imported descriptions are plain text.

The public storefront receives product type and currency, but not affiliateLink, costPrice or margin. The owning seller can still retrieve their full record. Affiliate updates preserve merchant fields and the original URL; only the EasyMart category is editable. Product updates, deletes and image updates are scoped to the authenticated active seller.

## Affiliate flow

```text
Original seller affiliate URL
  → AddProductForm.fetchFromAffiliateLink()
  → fetchAffiliateProduct() → POST /api/products/fetch-link
  → active-seller authentication
  → safeRemoteFetch(): validate DNS, pin address, validate redirects
  → extractAffiliateMetadata(): JSON-LD first, then product metadata
  → metadata + signed import receipt
  → seller reviews locked imported fields and supplies missing required fields
  → seller chooses EasyMart category
  → AddProductForm.add() → addProduct() → POST /api/products
  → verify seller-bound receipt and original URL
  → safely download imported images and upload to existing Cloudinary service
  → Product.create(): affiliate type, original URL, currency, seller/shop identity
  → storefront and product page
  → View Deal
  → GET /api/affiliate/redirect/[productId]
  → load affiliate product, validate stored original URL
  → AffiliateClick.create({ productId, sellerId }) with createdAt default
  → HTTP 302 with the stored original URL in Location; Cache-Control: no-store
  → merchant checkout/payment/delivery
```

The resolved metadata URL is used internally for relative images. It does not replace the saved affiliate URL. Tracking query parameters are retained. HEAD requests do not record clicks. GET visits are basic click events, not proof of a human visitor, sale or commission. No personal customer information is collected by AffiliateClick.

## Security

- HTTP and HTTPS only; embedded credentials, internal hostnames and nonstandard ports are rejected.
- IPv4/IPv6 loopback, private, link-local, metadata-service, multicast, reserved and relevant transition ranges are blocked. Alternate loopback URL representations are tested.
- All DNS answers must be public. The socket lookup returns only a validated pinned address, including Node's all-address lookup mode, to prevent a second uncontrolled DNS resolution.
- Each server-side redirect destination is validated before connecting. Five redirects maximum.
- A 12-second total fetch deadline covers redirects and downloads; standalone DNS validation has a five-second bound.
- HTML responses are limited to 2 MiB; image responses to 5 MiB. Both declared and streamed sizes are checked.
- HTML/XHTML content types are required for metadata; remote image downloads allow JPEG, PNG, WebP, GIF and AVIF. SVG and compressed responses are rejected.
- Import errors are sanitized. Authentication remains required for importing and publishing.
- Signed receipts bind metadata to the seller and original URL. Import tokens cannot be reused for another seller or a different URL.
- Backend cart, order creation, payment initiation, confirmation and shared settlement checks consult current database product types. Client snapshots cannot override affiliate classification.
- Existing affiliate cart entries are excluded from cart totals and shipping groups. The shipping UI also rejects affiliate snapshots.

The outbound customer redirect validates the stored original destination. Subsequent redirects performed by the merchant in the customer's browser are outside EasyMart's server-side fetch chain.

## Files changed

Paths below are relative to the repository root. Every source/configuration file modified or created for this task is listed.

| Path | What changed and why |
|---|---|
| `models/Product.ts` | Added productType enum/default and currency, preserving legacy physical behavior. |
| `types/product.d.ts` | Added product type/currency/import receipt fields and category-only update support. |
| `types/cart.d.ts` | Added optional product type to shipping product snapshots for the affiliate UI guard. |
| `utils/productPresentation.ts` (new) | Shared strict affiliate detection and currency-aware informational price formatting. |
| `components/SellerComponents/AddProductForm.tsx` | Added physical/affiliate selection, import loading/errors, locked retrieved fields, explicit missing-field fallback, receipt submission and no affiliate margin calculation. |
| `lib/safeRemote.ts` (new) | Shared bounded remote HTML/image fetching with DNS pinning and per-hop SSRF protection. |
| `lib/affiliateMetadata.ts` (new) | JSON-LD-first metadata extraction, graph/type variants, price/currency/brand/image parsing and product-evidence checks. |
| `lib/affiliateImport.ts` (new) | Signs and verifies seller/URL-bound import receipts, protecting available imported fields at publishing. |
| `app/api/products/fetch-link/route.ts` | Uses secure fetch/extraction, retains original URL and returns sanitized errors plus import receipt. |
| `app/api/products/route.ts` | Saves explicit product type/currency; verifies affiliate receipt; safely imports remote images; omits affiliate margin/cost fields; filters public responses. |
| `components/StoreComponents/ProductDetail.tsx` | Replaces affiliate quantity/cart/Buy Now with View Deal and merchant fulfillment/price wording; physical purchasing remains. Share text respects affiliate currency. |
| `components/StoreComponents/DynamicProductList.tsx` | Desktop/mobile affiliate cards use View Deal and currency-aware pricing instead of cart actions. |
| `components/StoreComponents/Products.tsx` | Carousel price display respects affiliate currency. |
| `components/StoreComponents/RelatedProduct.tsx` | Related-product pricing respects affiliate currency and omits physical discount badges for affiliate items. |
| `components/StoreComponents/FromShop.tsx` | Shop recommendations respect affiliate currency; affiliate descriptions render as plain text. |
| `models/AffiliateClick.ts` (new) | Stores product ID, seller ID and click timestamp without customer personal information. |
| `app/api/affiliate/redirect/[productId]/route.ts` (new) | Validated, uncached original-URL redirect after successful click recording; HEAD does not count. |
| `app/api/cart/add-to-cart/route.ts` | Rejects affiliate products using authoritative catalog data; preserves legacy physical additions. |
| `app/api/cart/get-cart/[userId]/route.ts` | Excludes affiliate cart entries from checkout groups/totals and removes private product fields. |
| `lib/physicalCheckout.ts` (new) | Shared authoritative product-type guard for order/payment boundaries. |
| `app/api/customers/order/route.ts` | Rejects affiliate products before user updates or order writes; existing physical shipping/order calculations remain. |
| `app/api/payments/create-session/route.ts` | Rejects affiliate products before starting a payment gateway session. |
| `app/api/payments/confirm/route.ts` | Rejects affiliate products before payment confirmation/settlement. |
| `lib/paymentGateway.ts` | Shared settlement also checks product types, covering callback/webhook settlement paths. |
| `components/StoreComponents/ShippingCart.tsx` | Prevents affiliate snapshots from displaying or submitting the normal shipping workflow. |
| `app/api/products/[productId]/route.ts` | Owner-scoped mutations, allowlisted updates, affiliate category-only edits, filtered public reads. |
| `app/api/products/image-update/route.ts` | Checks active-seller ownership and prevents replacement of affiliate imported images. |
| `components/SellerComponents/UpdateProduct.tsx` | Affiliate fields/images are locked; category-only payload; physical edit flow retained. |
| `components/SellerComponents/ProductTable.tsx` | Seller table respects currency and identifies affiliate stock as a merchant deal. |
| `lib/publicProduct.ts` (new) | Strips costs, margins and tracking URLs; supplies physical fallback in public serialization. |
| `app/api/home/route.ts` | Filters public homepage product data without changing discovery selection. |
| `app/api/price-range/route.ts` | Filters private fields from publicly returned latest products. |
| `app/api/products/product/[slug]/route.ts` | Filters product/related/shop responses and documents product type/currency in its local interface. |
| `app/api/query-products/route.ts` | Includes product type/currency in existing search projection for correct card behavior. |
| `app/api/wishlist/get-wishlist/[userId]/route.ts` | Reads current product type/currency and affiliate price for saved wishlist cards. |
| `app/(store)/dashboard/wishlist/page.tsx` | Affiliate wishlist items use View Deal and merchant currency; physical presentation remains. |
| `package.json` | Added test:affiliate and typecheck scripts; no dependencies installed or changed. |
| `tests/affiliate.test.cjs` (new) | Automated metadata, security, publishing, ownership, redirect, UI branch and physical regression tests. |
| `tests/live-import.cjs` (new) | Repeatable read-only live merchant metadata probe with no database writes. |
| `AFFILIATE_IMPLEMENTATION.md` (new) | This architecture, file inventory, evidence and limitations report. |

## Tests and physical regression

**PASS:** 61 automated tests, zero failures, via `npm run test:affiliate`.

Tests exercise the actual source modules, API handlers and component branches. Database, Cloudinary and payment gateways are replaced with deterministic substitutes. Component tests exercise hook state and event handlers; they are not browser visual tests.

Covered: physical default/model compatibility, manual physical creation and local images, legacy cart addition, physical Buy Now shipping dispatch, physical order/suborder creation with existing shipping calculation, server-derived physical gateway amount, wallet confirmation, affiliate publishing receipt enforcement, locked imported fields, missing metadata, URL changes/loading, desktop/mobile deal cards, public field filtering, owner updates/deletes, redirects and click-recording calls, wishlist currency/type, fetch authentication and sanitized errors, private/loopback/metadata URLs, private redirects, mixed DNS, address pinning, timeout, large responses, content types and malformed/nonproduct metadata.

**PASS:** final source-only TypeScript diagnostics: zero. **PASS:** git diff --check.

**FAIL, pre-existing tooling:** full project typecheck has 70 generated Next diagnostics and zero source diagnostics. Before implementation, .next/dev/types already referenced stale/missing route exports and removed wallet pages. Its routes.d.ts dates from August and validator.ts from July.

**FAIL, pre-existing tooling:** `npm run lint` invokes `next lint`; installed Next.js 16.2.7 treats lint as a nonexistent project directory. That script was not silently replaced.

**BUILD:** the restricted-network attempt failed downloading existing Geist fonts. A network-enabled `npm run build` compiled successfully in 97 seconds, then failed its TypeScript phase on the same pre-existing .next/dev/types/validator.ts route-export error. No production build success is claimed; stale generated caches were not hidden by changing project typecheck settings.

**UNVERIFIED:** browser visual behavior, a real MongoDB/Cloudinary publishing transaction, persisted click documents in a running database, and a real physical payment/checkout. No deployment, migration, live product/order creation, live click insertion or payment was performed.

## Marketplace compatibility

The actual safeRemoteFetch + extractAffiliateMetadata importer was exercised against these real URLs without browser automation or access-control bypasses:

| Provider / tested URL | Observed result |
|---|---|
| Amazon: https://www.amazon.com/dp/B0DNZ1M6C9 | No usable product metadata; import unavailable. |
| eBay: https://www.ebay.com/itm/800524595356 | Remote request unavailable; no successful import. |
| AliExpress: https://www.aliexpress.com/item/32899919461.html | Partial product metadata: product title, description and one image. Price, currency and brand unavailable. |
| Allbirds: https://www.allbirds.com/products/mens-tree-runners | Product title, description, one image, price 100 and USD currency retrieved. Brand unavailable. |

These are single-page observations on 6 October 2026. They do not establish universal provider support. Initial sandbox probes failed with EACCES; reported merchant results come from subsequent network-enabled read-only probes. No affiliate attribution or merchant conversion was verified by these probes.

## Remaining limitations

- Sites that do not expose accessible product metadata remain unavailable. Reliable marketplace integrations may require official merchant/affiliate APIs and credentials; none were added.
- Missing required metadata must be explicitly supplied before publishing. Missing currency is shown as unavailable, never assumed to be INR. Price is informational and can become stale; there is no automatic refresh job.
- Existing numeric price filters/sorting compare stored amounts without exchange-rate normalization. No currency conversion was introduced into existing search.
- Receipts expire after one hour; a seller must re-fetch after expiration. Controlled affiliate URL replacement/re-import editing is not implemented.
- Remote images must be accessible and fit permitted types/sizes. Individual failed image imports are skipped; publishing requires at least one successfully stored image.
- Click analytics are basic GET-event records. No views/CTR dashboard, conversion callbacks/postbacks, sales attribution, commission calculation, deduplication or bot filtering is implemented.
- Physical edit-page issues found during the investigation remain: its description submission uses the old state.description rather than editor content; category is absent from its physical update payload; existing string-based images do not satisfy its File-only replacement condition. Affiliate category updates have a separate correct payload; unrelated physical edit bugs were not expanded into this task.
- The baseline lint/generated-type problems and live browser/database/Cloudinary/payment verification gates remain open.


## Controlled manual fallback (7 October 2026)

The existing automatic importer and signed merchant metadata receipt remain intact. A validated HTML merchant response with unavailable status/type/encoding, or a response without usable Product metadata, may now return a separate one-hour manual-fallback authorization. It contains only seller identity and the original affiliate URL, uses a distinct JWT audience, and is not a metadata receipt. It is never stored on the Product.

Seller flow: Fetch Product -> controlled import unavailable -> Enter Details Manually -> locked original affiliate link -> seller-supplied name, optional brand, EasyMart category, informational merchant price, currency, description and uploaded images -> Publish Affiliate Product. Change Affiliate Link / Start Again discards the fallback/details and requires a new fetch. Publication verifies the authorization and revalidates public DNS before upload/save. Remote image URLs are rejected in manual mode; uploads use the existing Cloudinary workflow. Affiliate stock/discount remain zero and cost/margin remain absent.

Invalid/private URLs, private DNS answers, invalid or excessive redirects, response-size limits, unknown transport errors and timeouts do not grant fallback. Timeouts offer retry only, including DNS timeouts. This intentionally avoids treating an unvalidated or incomplete network operation as fallback eligibility.

Amazon hostname matching uses exact marketplace domains or their subdomains, plus amzn.to/a.co. Lookalikes are not recognized. Provider detection changes only the failure message. No ASIN is extracted or stored because the Product model has no provider-identifier field and fallback does not require it. No Amazon API, browser retrieval, anti-bot bypass or image scraping was introduced.

Manual listings remain productType=affiliate and use the unchanged View Deal -> click record -> original URL redirect. The same cart/order/payment guards apply. Public product APIs still omit affiliate URLs, cost and margin. Seller content is explicitly described as not merchant-verified. Conversion/sale tracking and Amazon Creators API remain unimplemented.

Validation is local and uses isolated route/component fixtures with mocked database, Cloudinary and gateway boundaries. Live merchant compatibility and a real seller browser session were not retested in this phase.


Current fallback verification: 61 existing + 11 new = 72 passing tests, 0 failures. The new integration fixture publishes a manual listing, renders its View Deal CTA, records its redirect click, preserves the exact URL and rejects cart/order attempts; the preserved tests also cover physical shipping/orders/payment and affiliate payment/settlement guards. Source-only TypeScript passes with a temporary config excluding generated .next files. Full TypeScript retains stale generated .next/dev/types route errors. The existing next lint script fails because Next.js 16 does not provide that command. The local next build attempt failed fetching the existing Geist and Geist Mono Google Fonts; no successful build is claimed. No deployment, production database write, provider change or live seller/browser test was performed.
