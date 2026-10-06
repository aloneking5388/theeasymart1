const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { EventEmitter } = require('node:events');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname, '..');

// Compile source in memory; dependency substitutes isolate database and remote side effects.
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    function localRequire(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        let target = name.startsWith('@/') ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(file), name);
        target = [target, target + '.ts', target + '.tsx'].find((p) => fs.existsSync(p));
        if (target) return load(target);
      }
      return require(name);
    }
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

const load = loader();
const metadata = load('lib/affiliateMetadata.ts');
const security = load('lib/safeRemote.ts');
const presentation = load('utils/productPresentation.ts');
const merchantUrl = 'https://merchant.example/item?tag=seller-20&ref=x&aff=abc&affiliate=123';
const productId = '507f1f77bcf86cd799439011';
const sellerId = '507f1f77bcf86cd799439012';
const details = { name: 'Merchant camera', description: 'A camera', brand: 'CameraCo', price: 129.5, currency: 'USD', images: ['https://cdn.example/camera.jpg'] };
const html = `<title>Generic title</title><meta property="og:title" content="Wrong OG title"><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': ['Thing', 'Product'], ...details, image: '/camera.jpg', offers: [{ price: '129.50', priceCurrency: 'USD' }] }] })}</script>`;

test('JSON-LD graph and array-valued type take precedence; image URLs resolve', () => {
  const result = metadata.extractAffiliateMetadata(html, merchantUrl);
  assert.equal(result.name, details.name); assert.equal(result.price, 129.5);
  assert.equal(result.brand, 'CameraCo'); assert.equal(result.currency, 'USD');
  assert.deepEqual(result.images, ['https://merchant.example/camera.jpg']);
});
test('top-level array, ImageObject and HTML descriptions produce plain text', () => {
  const result = metadata.extractAffiliateMetadata(`<script type="application/ld+json">${JSON.stringify([{ '@type': 'Product', name: 'Camera', description: '<b>Clear</b>', image: { url: '/a.png' }, offers: { price: 0 } }])}</script>`, merchantUrl);
  assert.equal(result.description, 'Clear'); assert.equal(result.price, 0); assert.equal(result.currency, null);
});
test('OG product fallback preserves missing fields without inventing values', () => {
  const result = metadata.extractAffiliateMetadata('<meta property="og:type" content="product"><meta property="og:title" content="Camera">', merchantUrl);
  assert.equal(result.name, 'Camera'); assert.equal(result.price, null); assert.equal(result.brand, ''); assert.deepEqual(result.images, []);
});
test('malformed JSON falls back to price metadata; unrelated Twitter data is ignored', () => {
  const result = metadata.extractAffiliateMetadata('<title>Camera</title><script type="application/ld+json">{bad</script><meta property="product:price:amount" content="1.234,50"><meta name="twitter:data1" content="999">', merchantUrl);
  assert.equal(result.price, 1234.5);
  assert.throws(() => metadata.extractAffiliateMetadata('<title>Camera</title><meta name="twitter:data1" content="999">', merchantUrl));
});
for (const content of ['', '<title>Home</title>', '<title>Robot Check</title><meta property="product:price:amount" content="20">']) test('reject unavailable product metadata: ' + content.slice(0, 30), () => assert.throws(() => metadata.extractAffiliateMetadata(content, merchantUrl)));
for (const raw of ['http://localhost/a','http://127.0.0.1','http://127.1','http://2130706433','http://0x7f000001','http://10.0.0.1','http://172.16.0.1','http://192.168.1.1','http://169.254.169.254/latest/meta-data','http://100.100.100.200','http://[::1]','http://[::ffff:127.0.0.1]','http://[fc00::1]','http://[fe80::1]','https://foo.internal','http://intranet','file:///etc/passwd','ftp://example.com','https://u:p@example.com','http://example.com:8080','not a URL']) test('blocks unsafe URL ' + raw, () => assert.throws(() => security.parsePublicUrl(raw)));
test('permits public IPs and preserves query parameters', () => {
  assert(security.isPublicAddress('8.8.8.8')); assert(security.isPublicAddress('2606:4700:4700::1111'));
  assert.equal(security.parsePublicUrl(merchantUrl).toString(), merchantUrl);
});

function remoteFixture(responses, addresses = [{ address: '93.184.216.34', family: 4 }]) {
  const calls = [];
  const request = (url, options, callback) => {
    const req = new EventEmitter();
    req.end = () => {
      options.lookup(url.hostname, {}, (err, address, family) => calls.push({ url: url.toString(), address, family, err }));
      options.lookup(url.hostname, { all: true }, (err, addresses) => { assert.equal(err, null); assert.deepEqual(addresses, [{ address: '93.184.216.34', family: 4 }]); });
      const data = responses[calls.length - 1] ?? responses[responses.length - 1];
      if (data.slow) return;
      setImmediate(() => {
        const res = new EventEmitter();
        res.statusCode = data.status ?? 200; res.headers = data.headers ?? { 'content-type': 'text/html' }; res.destroy = () => {};
        callback(res);
        for (const chunk of data.chunks ?? [Buffer.from('HTML')]) res.emit('data', chunk);
        res.emit('end');
      });
    };
    options.signal.addEventListener('abort', () => req.emit('error', new Error('aborted')), { once: true });
    return req;
  };
  const safe = loader({ 'node:dns/promises': { lookup: async () => addresses }, 'node:http': { request }, 'node:https': { request } })('lib/safeRemote.ts');
  return { safe, calls };
}
test('validated DNS address is pinned in the socket and public redirects work', async () => {
  const { safe, calls } = remoteFixture([{ status: 302, headers: { location: '/next' } }, {}]);
  const result = await safe.safeRemoteFetch('https://merchant.example/a', { kind: 'html' });
  assert.equal(result.finalUrl, 'https://merchant.example/next'); assert.equal(calls.length, 2); assert.equal(calls[0].address, '93.184.216.34');
});
test('redirect to private address is blocked before making second request', async () => {
  const { safe, calls } = remoteFixture([{ status: 302, headers: { location: 'http://10.0.0.1/secret' } }]);
  await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html' }), /public HTTP/); assert.equal(calls.length, 1);
});
test('mixed public/private DNS answers are rejected', async () => {
  const { safe, calls } = remoteFixture([{}], [{ address: '93.184.216.34', family: 4 }, { address: '192.168.1.1', family: 4 }]);
  await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html' }), /private/); assert.equal(calls.length, 0);
});
test('redirect limit', async () => {
  const { safe } = remoteFixture([{ status: 302, headers: { location: '/loop' } }]);
  await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html', maxRedirects: 1 }), /too many redirects/);
});
test('slow response times out', async () => {
  const { safe } = remoteFixture([{ slow: true }]);
  await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html', timeoutMs: 20 }), /timed out/);
});
test('DNS resolution is covered by total timeout', async () => {
  const safe = loader({ 'node:dns/promises': { lookup: () => new Promise(() => {}) } })('lib/safeRemote.ts');
  await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html', timeoutMs: 20 }), /timed out/);
});
test('large declared and streamed responses are blocked', async () => {
  for (const response of [{ headers: { 'content-type': 'text/html', 'content-length': '10000' } }, { chunks: [Buffer.alloc(11)] }]) {
    const { safe } = remoteFixture([response]); await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html', maxBytes: 10 }), /too large/);
  }
});
test('non-HTML, compressed responses, error status and SVG images are blocked', async () => {
  for (const response of [{ headers: { 'content-type': 'application/json' } }, { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' } }, { status: 403 }]) {
    const { safe } = remoteFixture([response]); await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'html' }));
  }
  const { safe } = remoteFixture([{ headers: { 'content-type': 'image/svg+xml' } }]); await assert.rejects(safe.safeRemoteFetch(merchantUrl, { kind: 'image' }));
});

process.env.JWT_SECRET = 'test-only-affiliate-secret';
const receipt = load('lib/affiliateImport.ts');
test('import receipt prevents metadata, seller and URL tampering', () => {
  const token = receipt.signAffiliateImport({ ...details, sellerId, originalAffiliateUrl: merchantUrl });
  assert.equal(receipt.verifyAffiliateImport(token, sellerId, merchantUrl).price, 129.5);
  assert.throws(() => receipt.verifyAffiliateImport(token, 'other', merchantUrl));
  assert.throws(() => receipt.verifyAffiliateImport(token, sellerId, merchantUrl + '&new=1'));
  assert.throws(() => receipt.verifyAffiliateImport(token.slice(0, -4) + 'AAAA', sellerId, merchantUrl));
});
const authMocks = { '@/utils/ConnectDB': { connectDB: async () => {} }, '@/lib/auth': { verifyToken: () => ({ id: sellerId, role: 'seller', status: 'active' }) } };
function request(url, body, headers = {}) { return new NextRequest('https://easymart.example' + url, { method: 'POST', headers: { Authorization: 'Bearer token', ...headers }, body: body instanceof FormData ? body : JSON.stringify(body) }); }

test('affiliate publish trusts signed merchant data, preserves URL/currency and excludes margin', async () => {
  let saved; const fetched = [];
  const route = loader({ ...authMocks, '@/models/Seller': { findById: async () => ({ shopInfo: { shopName: 'My shop' } }) }, '@/models/Product': { create: async (data) => (saved = data) }, '@/lib/cloudinary': { uploadToCloudinary: async () => ({ secure_url: 'https://res.cloudinary.com/camera.jpg' }) }, '@/lib/safeRemote': { validatePublicUrl: async () => {}, safeRemoteFetch: async (url) => { fetched.push(url); return { body: Buffer.from('image') }; } } })('app/api/products/route.ts');
  const form = new FormData();
  for (const [key, value] of Object.entries({ productType: 'affiliate', affiliateLink: merchantUrl, importToken: receipt.signAffiliateImport({ ...details, sellerId, originalAffiliateUrl: merchantUrl }), name: 'Forged', description: 'Forged', price: '999', brand: 'Forged', category: 'Cameras', stock: '10', discount: '50', margin: '200', costPrice: '20', imageUrls: 'http://127.0.0.1/attack' })) form.append(key, value);
  const response = await route.POST(request('/api/products', form));
  assert.equal(response.status, 200); assert.equal(saved.productType, 'affiliate'); assert.equal(saved.affiliateLink, merchantUrl);
  assert.equal(saved.name, details.name); assert.equal(saved.price, details.price); assert.equal(saved.currency, 'USD');
  assert.equal(saved.stock, 0); assert.equal(saved.discount, 0); assert.equal(saved.margin, undefined); assert.equal(saved.costPrice, undefined);
  assert.deepEqual(fetched, details.images); assert.equal(saved.sellerId, sellerId); assert.equal(saved.shopName, 'My shop');
});
test('physical creation without productType retains stock, discount and uploaded images', async () => {
  let saved;
  const route = loader({ ...authMocks, '@/models/Seller': { findById: async () => ({ shopInfo: { shopName: 'Shop' } }) }, '@/models/Product': { create: async (data) => (saved = data) }, '@/lib/cloudinary': { uploadToCloudinary: async () => ({ secure_url: 'https://res.cloudinary.com/a.jpg' }) } })('app/api/products/route.ts');
  const form = new FormData(); for (const [k,v] of Object.entries({ name: 'Physical', description: 'Manual', brand: 'Brand', category: 'Cameras', price: '1000', stock: '5', discount: '10' })) form.append(k,v);
  form.append('images', new Blob(['image'], { type: 'image/jpeg' }), 'a.jpg');
  const response = await route.POST(request('/api/products', form)); assert.equal(response.status, 200);
  assert.equal(saved.productType, 'physical'); assert.equal(saved.stock, 5); assert.equal(saved.price, 1000); assert.equal(saved.discount, 10);
});
test('affiliate publish without valid import receipt is rejected', async () => {
  let writes = 0;
  const route = loader({ ...authMocks, '@/models/Seller': { findById: async () => ({ shopInfo: { shopName: 'Shop' } }) }, '@/models/Product': { create: async () => writes++ }, '@/lib/safeRemote': { validatePublicUrl: async () => {} } })('app/api/products/route.ts');
  const form = new FormData(); form.append('productType', 'affiliate'); form.append('affiliateLink', merchantUrl);
  assert.equal((await route.POST(request('/api/products', form))).status, 400); assert.equal(writes, 0);
});
test('redirect records click and sends exact original URL without caching', async () => {
  const clicks = [];
  const route = loader({ ...authMocks, '@/models/Product': { findById: async () => ({ _id: productId, sellerId, productType: 'affiliate', affiliateLink: merchantUrl }) }, '@/models/AffiliateClick': { create: async (data) => clicks.push(data) }, '@/lib/safeRemote': { validatePublicUrl: async (url) => assert.equal(url, merchantUrl) } })('app/api/affiliate/redirect/[productId]/route.ts');
  const response = await route.GET(new NextRequest('https://easymart.example/api/affiliate/redirect/' + productId));
  assert.equal(response.status, 302); assert.equal(response.headers.get('location'), merchantUrl); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(clicks, [{ productId, sellerId }]);
});
test('redirect rejects legacy physical products and invalid stored destinations', async () => {
  let clicks = 0;
  for (const type of [undefined, 'affiliate']) {
    const route = loader({ ...authMocks, '@/models/Product': { findById: async () => ({ productType: type, affiliateLink: 'http://127.0.0.1' }) }, '@/models/AffiliateClick': { create: async () => clicks++ } })('app/api/affiliate/redirect/[productId]/route.ts');
    assert.notEqual((await route.GET(new NextRequest('https://easymart.example/api/affiliate/redirect/' + productId))).status, 302);
  }
  assert.equal(clicks, 0);
});
test('cart rejects affiliate and permits legacy physical products', async () => {
  for (const type of ['affiliate', undefined]) {
    let created = 0;
    const route = loader({ ...authMocks, '@/models/Product': { findById: () => ({ select: async () => ({ productType: type }) }) }, '@/models/Card': { findOne: async () => null, create: async () => { created++; return {}; } } })('app/api/cart/add-to-cart/route.ts');
    const response = await route.POST(request('/api/cart/add-to-cart', { productId, userId: sellerId, quantity: 1 }));
    assert.equal(response.status, type === 'affiliate' ? 400 : 201); assert.equal(created, type === 'affiliate' ? 0 : 1);
  }
});
test('checkout guard trusts database type despite forged physical snapshot; legacy is allowed', async () => {
  for (const type of ['affiliate', undefined]) {
    const guard = loader({ '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{ productType: type }] }) }) } })('lib/physicalCheckout.ts');
    if (type === 'affiliate') await assert.rejects(guard.assertPhysicalProducts([{ _id: productId, productType: 'physical' }]), /Affiliate/);
    else await guard.assertPhysicalProducts([{ _id: productId }]);
    await assert.rejects(guard.assertPhysicalProducts([])); await assert.rejects(guard.assertPhysicalProducts([{ name: 'Forged' }]));
  }
});
test('order creation rejects affiliate before modifying user or writing an order', async () => {
  let writes = 0;
  const route = loader({ ...authMocks, '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{ productType: 'affiliate' }] }) }) }, '@/models/User': { findById: async () => { writes++; } }, '@/models/CustomerOrder': { CustomerOrder: { create: async () => { writes++; } } } })('app/api/customers/order/route.ts');
  const response = await route.POST(request('/api/customers/order', { products: [{ products: [{ productInfo: { _id: productId, productType: 'physical' } }] }] }));
  assert.equal(response.status, 400); assert.equal(writes, 0);
});
test('owner-scoped affiliate update only changes category and rejects metadata changes', async () => {
  let update;
  const route = loader({ ...authMocks, '@/models/Product': { findOne: async (filter) => { assert.equal(filter.sellerId, sellerId); return { productType: 'affiliate' }; }, findOneAndUpdate: async (filter, changes) => { assert.equal(filter.sellerId, sellerId); update = changes; return {}; } } })('app/api/products/[productId]/route.ts');
  assert.equal((await route.POST(request('/api/products/' + productId, { productId, category: 'Cameras' }))).status, 200);
  assert.deepEqual(update, { $set: { category: 'Cameras' } });
  assert.equal((await route.POST(request('/api/products/' + productId, { name: 'Changed' }))).status, 400);
});
test('other seller cannot update or delete product', async () => {
  let writes = 0;
  const route = loader({ ...authMocks, '@/models/Product': { findOne: async () => null, findOneAndUpdate: async () => writes++, findOneAndDelete: async (filter) => { assert.equal(filter.sellerId, sellerId); return null; } } })('app/api/products/[productId]/route.ts');
  assert.equal((await route.POST(request('/api/products/' + productId, { category: 'Other' }))).status, 404);
  assert.equal((await route.DELETE(request('/api/products/' + productId, {}))).status, 404); assert.equal(writes, 0);
});
test('public serializer hides costs/link and treats missing type as physical; prices respect currency', () => {
  const visible = load('lib/publicProduct.ts').publicProduct({ name: 'Camera', price: 10, costPrice: 5, margin: 10, affiliateLink: merchantUrl });
  assert.equal(visible.productType, 'physical'); assert(!('costPrice' in visible)); assert(!('margin' in visible)); assert(!('affiliateLink' in visible));
  assert.equal(presentation.isAffiliateProduct({}), false); assert.equal(presentation.formatProductPrice({ price: 10 }), '₹ 10');
  assert.match(presentation.formatProductPrice({ productType: 'affiliate', price: 10, currency: 'USD' }), /\$/);
  assert.match(presentation.formatProductPrice({ productType: 'affiliate', price: 10 }), /currency unavailable/);
});

// Exercise real component branches and event handlers with deterministic hook state.
function componentHarness(file, state) {
  let cursor = 0; const slots = []; const effects = []; const dispatched = []; const navigation = [];
  const react = { ...require('react'), useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; }, useRef: () => ({ current: null }), useEffect: (fn, deps) => { const index = cursor++; if (!slots[index] || deps.some((dep, i) => dep !== slots[index][i])) effects.push(fn); slots[index] = deps; } };
  const action = (type) => (payload) => ({ type, payload });
  const stubs = new Proxy({ __esModule: true, default: 'Stub' }, { get: (target, key) => key in target ? target[key] : String(key) });
  const mocks = {
    react,
    '@/store/hooks': { useAppSelector: (selector) => selector(state), useAppDispatch: () => (value) => { dispatched.push(value); if (value.type === 'clear') state.product.affiliateProduct = null; return value; } },
    'next/navigation': { useRouter: () => ({ push: (url) => navigation.push(url) }), useParams: () => ({ Id: productId }) },
    'next/dynamic': { __esModule: true, default: () => 'Editor' }, 'next/image': { __esModule: true, default: 'Image' }, 'next/link': { __esModule: true, default: 'Link' },
    'react-hot-toast': { __esModule: true, default: { success: () => {}, error: () => {} } },
    '@/store/products/productSlice': { fetchAffiliateProduct: action('fetch'), clearAffiliateProduct: action('clear'), addProduct: action('add'), productMessageClear: action('message'), getProduct: action('get'), updateProduct: action('update'), productImageUpdate: action('image') },
    '@/store/Categoris/categorySlice': { get_category: action('category') },
    '@/store/cart/cartSlice': { addToCart: action('cart'), addToWishlist: action('wishlist'), cartMessageClear: action('cartClear'), setShippingDetails: action('shipping') },
  };
  for (const name of ['@/components/ui/input','@/components/ui/label','@/components/ui/button','@/components/ui/card','../DashboardComponents/FormInput','../ui/carousel','./Retings','./UniversalShareButtons','../Skeletons/SkeletonProductCard','lucide-react','react-icons/bs','react-icons/io5','react-icons/ai','react-icons/fa']) mocks[name] = stubs;
  const component = loader(mocks)(file).default;
  const flatten = (node) => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' && node.props ? [node, ...flatten(node.props.children)] : [];
  return { state, dispatched, navigation, render: (props) => { cursor = 0; const tree = component(props); while (effects.length) effects.shift()(); return flatten(tree); } };
}
function uiState(product = null) { return { auth: { userInfo: { id: sellerId, role: 'seller', status: 'active' } }, category: { categorys: [{ name: 'Cameras' }] }, product: { product, affiliateProduct: null, affiliateError: '', affiliateLoader: false }, review: { totalReview: 0 }, cart: {} }; }
test('seller physical form defaults correctly; affiliate import locks verified fields and publishes receipt', () => {
  const harness = componentHarness('components/SellerComponents/AddProductForm.tsx', uiState());
  let nodes = harness.render();
  assert.equal(nodes.find((n) => n.type === 'input' && n.props.type === 'radio').props.checked, true);
  assert(!nodes.some((n) => n.props.id === 'affiliateLink'));
  nodes.filter((n) => n.type === 'input' && n.props.type === 'radio')[1].props.onChange(); nodes = harness.render();
  nodes.find((n) => n.props.id === 'affiliateLink').props.onChange({ target: { value: merchantUrl } }); nodes = harness.render();
  nodes.find((n) => n.props.children === 'Fetch Product').props.onClick();
  assert.equal(harness.dispatched.at(-1).type, 'fetch');
  harness.state.product.affiliateProduct = { ...details, originalAffiliateUrl: merchantUrl, importToken: 'receipt' };
  harness.render(); nodes = harness.render();
  assert.equal(nodes.find((n) => n.props.id === 'name').props.readOnly, true);
  assert.equal(nodes.find((n) => n.props.id === 'brand').props.readOnly, true);
  assert.equal(nodes.find((n) => n.props.id === 'price').props.value, String(details.price));
  assert.equal(nodes.find((n) => n.props.id === 'price').props.readOnly, true);
  assert(!nodes.some((n) => n.props.id === 'margin'));
  assert(!nodes.some((n) => n.props.id === 'image'));
  nodes.find((n) => n.type === 'span' && n.props.children === 'Cameras').props.onClick(); nodes = harness.render();
  nodes.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} });
  const submission = harness.dispatched.at(-1); assert.equal(submission.type, 'add');
  assert.equal(submission.payload.get('productType'), 'affiliate'); assert.equal(submission.payload.get('affiliateLink'), merchantUrl); assert.equal(submission.payload.get('importToken'), 'receipt'); assert.equal(submission.payload.get('margin'), null);
  nodes.find((n) => n.props.id === 'affiliateLink').props.onChange({ target: { value: merchantUrl + '&changed=1' } }); nodes = harness.render();
  assert.equal(nodes.find((n) => n.props.children === 'Publish Affiliate Product').props.disabled, true);
});
test('incomplete affiliate metadata permits only missing fields; loading prevents another fetch', () => {
  const harness = componentHarness('components/SellerComponents/AddProductForm.tsx', uiState());
  let nodes = harness.render(); nodes.filter((n) => n.type === 'input' && n.props.type === 'radio')[1].props.onChange(); nodes = harness.render();
  nodes.find((n) => n.props.id === 'affiliateLink').props.onChange({ target: { value: merchantUrl } }); harness.render();
  harness.state.product.affiliateProduct = { ...details, brand: '', images: [], price: null, originalAffiliateUrl: merchantUrl, importToken: 'receipt' }; harness.render(); nodes = harness.render();
  assert.equal(nodes.find((n) => n.props.id === 'name').props.readOnly, true);
  assert.equal(nodes.find((n) => n.props.id === 'brand').props.readOnly, false);
  assert.equal(nodes.find((n) => n.props.id === 'price').props.readOnly, false);
  assert(nodes.some((n) => n.props.id === 'image'));
  harness.state.product.affiliateLoader = true; nodes = harness.render(); assert.equal(nodes.find((n) => n.props.id === 'affiliateLink').props.disabled, true);
});
test('customer affiliate detail has only merchant CTA; legacy physical Buy Now starts shipping', () => {
  for (const type of ['affiliate', undefined]) {
    const product = { ...details, id: productId, slug: 'camera', sellerId, stock: 5, discount: 0, productType: type };
    const harness = componentHarness('components/StoreComponents/ProductDetail.tsx', uiState(product));
    const nodes = harness.render();
    if (type === 'affiliate') {
      assert(nodes.some((n) => n.type === 'a' && n.props.href === '/api/affiliate/redirect/' + productId));
      assert(!nodes.some((n) => n.props.children === 'Buy Now' || n.props.children === 'Add To Cart'));
    } else {
      assert(!nodes.some((n) => n.props.children === 'View Deal'));
      nodes.find((n) => n.props.children === 'Buy Now').props.onClick();
      assert.equal(harness.dispatched.at(-1).type, 'shipping'); assert.deepEqual(harness.navigation, ['/shipping']);
      assert.equal(harness.dispatched.at(-1).payload.tax, product.price * 0.18);
      nodes.find((n) => n.props.children === 'Add To Cart').props.onClick(); assert.equal(harness.dispatched.at(-1).type, 'cart');
    }
  }
});

test('physical order creation retains shipping calculation and seller order flow', async () => {
  let saved; let sellerOrders;
  const route = loader({ ...authMocks,
    '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{}] }) }) },
    '@/models/User': { findById: async () => null },
    '@/models/CustomerOrder': { CustomerOrder: { create: async (data) => { saved = data; return { id: productId }; } } },
    '@/models/AuthOrder': { insertMany: async (data) => { sellerOrders = data; } },
    '@/models/Card': { findByIdAndDelete: async () => {} },
  })('app/api/customers/order/route.ts');
  const product = { ...details, _id: productId, stock: 5, discount: 0 };
  const response = await route.POST(request('/api/customers/order', { price: 1000, products: [{ sellerId, price: 1000, products: [{ quantity: 1, productInfo: product }] }], userId: sellerId, shippingInfo: { address: 'Test address' }, shippingMethodMap: { [sellerId]: 'home delivery' } }));
  assert.equal(response.status, 200); assert.equal(saved.price, 2000); assert.equal(saved.products[0]._id, productId); assert.equal(saved.payment_status, 'unpaid'); assert.equal(sellerOrders[0].sellerId, sellerId);
});
test('payment creation rejects affiliate before contacting gateway; physical uses server amount', async () => {
  const jwt = require('jsonwebtoken'); const token = jwt.sign({ id: sellerId, role: 'user' }, process.env.JWT_SECRET);
  for (const type of ['affiliate', undefined]) {
    let gatewayCalls = 0; let amount;
    const route = loader({ ...authMocks,
      '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{ productType: type }] }) }) },
      '@/models/CustomerOrder': { CustomerOrder: { findOne: async () => ({ products: [{ _id: productId }], price: 1000, payment_status: 'unpaid' }) } },
      '@/models/CustomerWallet': { findOne: async () => ({ amount: 0 }) },
      '@/lib/paymentGateway': { paymentCurrency: 'INR', getAppBaseUrl: () => 'https://easymart.example', toMinorUnit: (value) => value * 100, getRazorpayClient: () => ({ orders: { create: async (data) => { gatewayCalls++; amount = data.amount; return { id: 'gateway-order', ...data }; } } }) },
    })('app/api/payments/create-session/route.ts');
    const response = await route.POST(request('/api/payments/create-session', { gateway: 'razorpay', orderId: productId, amount: 1000 }, { Authorization: 'Bearer ' + token }));
    assert.equal(response.status, type === 'affiliate' ? 400 : 200); assert.equal(gatewayCalls, type === 'affiliate' ? 0 : 1);
    if (!type) assert.equal(amount, 100000);
  }
});
test('wallet confirmation rejects affiliate before settlement and permits physical', async () => {
  const token = require('jsonwebtoken').sign({ id: sellerId, role: 'user' }, process.env.JWT_SECRET);
  for (const type of ['affiliate', undefined]) {
    let settled = 0;
    const route = loader({ ...authMocks,
      '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{ productType: type }] }) }) },
      '@/models/CustomerOrder': { CustomerOrder: { findOne: async () => ({ products: [{ _id: productId }], price: 1000 }) } },
      '@/lib/paymentGateway': { markOrderPaid: async () => { settled++; return {}; }, getGatewayLabel: () => 'Wallet' },
    })('app/api/payments/confirm/route.ts');
    const response = await route.POST(request('/api/payments/confirm', { gateway: 'wallet', orderId: productId, walletAmount: 1000 }, { Authorization: 'Bearer ' + token }));
    assert.equal(response.status, type === 'affiliate' ? 400 : 200); assert.equal(settled, type === 'affiliate' ? 0 : 1);
  }
});
test('product cards replace cart actions with merchant CTA on desktop and mobile', () => {
  for (const type of ['affiliate', undefined]) {
    const harness = componentHarness('components/StoreComponents/DynamicProductList.tsx', uiState());
    const nodes = harness.render({ products: [{ ...details, _id: productId, slug: 'camera', productType: type }] });
    const deals = nodes.filter((node) => node.type === 'a' && node.props.children === 'View Deal');
    assert.equal(deals.length, type === 'affiliate' ? 2 : 0);
    const carts = nodes.filter((node) => node.type === 'AiOutlineShoppingCart'); assert.equal(carts.length, type === 'affiliate' ? 0 : 2);
  }
});
test('new Product schema defaults to physical without database migration', () => {
  const Product = load('models/Product.ts').default;
  const product = new Product({ name: 'Legacy' }); assert.equal(product.productType, 'physical');
  assert.deepEqual(Product.schema.path('productType').enumValues, ['physical', 'affiliate']);
});
test('HEAD redirect requests do not record clicks', async () => {
  const route = loader({ ...authMocks })('app/api/affiliate/redirect/[productId]/route.ts');
  assert.equal((await route.HEAD()).status, 405);
});

test('wishlist response uses current affiliate currency/type without exposing private fields', async () => {
  const route = loader({ ...authMocks,
    '@/models/Wishlist': { find: async () => [{ productId, toObject: () => ({ productId, price: 999, name: 'Camera' }) }] },
    '@/models/Product': { find: () => ({ select: () => ({ lean: async () => [{ _id: productId, productType: 'affiliate', currency: 'USD', price: 129.5 }] }) }) },
  })('app/api/wishlist/get-wishlist/[userId]/route.ts');
  const response = await route.GET(new NextRequest('https://easymart.example/api/wishlist/get-wishlist/' + sellerId));
  const item = (await response.json()).wishlistItems[0]; assert.equal(item.productType, 'affiliate'); assert.equal(item.currency, 'USD'); assert.equal(item.price, 129.5); assert(!('affiliateLink' in item));
});

test('fetch API signs product details with original URL, not resolved URL, and requires active seller', async () => {
  const route = loader({ ...authMocks, '@/lib/safeRemote': { safeRemoteFetch: async () => ({ body: Buffer.from(html), finalUrl: 'https://merchant.example/resolved' }) } })('app/api/products/fetch-link/route.ts');
  const response = await route.POST(request('/api/products/fetch-link', { url: merchantUrl }));
  assert.equal(response.status, 200); const data = await response.json();
  assert.equal(data.originalAffiliateUrl, merchantUrl); assert.equal(receipt.verifyAffiliateImport(data.importToken, sellerId, merchantUrl).name, details.name);
  const unauthorized = loader({ '@/lib/auth': { verifyToken: () => ({ id: sellerId, role: 'admin', status: 'active' }) } })('app/api/products/fetch-link/route.ts');
  assert.equal((await unauthorized.POST(request('/api/products/fetch-link', { url: merchantUrl }))).status, 403);
  assert.equal((await route.POST(new NextRequest('https://easymart.example/api/products/fetch-link', { method: 'POST', body: '{}' }))).status, 401);
});
test('fetch API returns useful errors without disclosing transport exceptions', async () => {
  const route = loader({ ...authMocks, '@/lib/safeRemote': { ...security, safeRemoteFetch: async () => { throw new Error('private host and stack details'); } } })('app/api/products/fetch-link/route.ts');
  const response = await route.POST(request('/api/products/fetch-link', { url: merchantUrl })); const data = await response.json();
  assert.equal(response.status, 422); assert.equal(data.success, false); assert.equal(data.code, 'PRODUCT_FETCH_UNAVAILABLE'); assert(!JSON.stringify(data).includes('private host'));
});
