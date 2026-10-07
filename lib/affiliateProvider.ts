const amazonHosts = ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.ae', 'amazon.de', 'amazon.ca', 'amazon.com.au', 'amazon.co.jp'];
export function affiliateProvider(raw: string): 'amazon' | 'other' {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/\.$/, '');
    return amazonHosts.some(domain => host === domain || host.endsWith('.' + domain)) || host === 'amzn.to' || host === 'a.co' ? 'amazon' : 'other';
  } catch { return 'other'; }
}
