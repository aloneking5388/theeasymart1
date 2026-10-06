// Read-only provider probe. Never publishes products, records clicks or bypasses access controls.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { safeRemoteFetch } = load('lib/safeRemote.ts');
const { extractAffiliateMetadata } = load('lib/affiliateMetadata.ts');
(async () => {
  const results = await Promise.all(process.argv.slice(2).map(async (url) => {
    try {
      const response = await safeRemoteFetch(url, { kind: 'html' });
      const data = extractAffiliateMetadata(response.body.toString('utf8'), response.finalUrl);
      return { url, result: 'METADATA_RETRIEVED', fields: { name: data.name, description: !!data.description, price: data.price, currency: data.currency, brand: !!data.brand, imageCount: data.images.length } };
    } catch (error) { return { url, result: 'UNAVAILABLE', code: error.code || 'PRODUCT_FETCH_UNAVAILABLE', transportCode: error.cause?.code, message: error.code ? error.message : 'Product metadata unavailable.' }; }
  }));
  console.log(JSON.stringify(results, null, 2));
})();
