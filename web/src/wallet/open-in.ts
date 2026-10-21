// Vendor deep links. Rabby: RabbyHub/rabby-mobile apps/mobile/src/hooks/universalLink.ts.
export const OPEN_IN = [
  { icon: 'metaMaskWallet', name: 'MetaMask', href: (url: string) => `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, '')}` },
  { icon: 'coinbaseWallet', name: 'Coinbase Wallet', href: (url: string) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
  { icon: 'rabbyWallet', name: 'Rabby', href: (url: string) => `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}` },
  { icon: 'phantomWallet', name: 'Phantom', href: (url: string) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}` },
];
