import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { loadConfig } from './config';
import { createWalletConfig } from './wallet/config';
import './styles.css';

const site = await loadConfig();
const wallet = createWalletConfig(site);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
createRoot(document.getElementById('root')!).render(<StrictMode><WagmiProvider config={wallet}><QueryClientProvider client={queryClient}><App config={site} /></QueryClientProvider></WagmiProvider></StrictMode>);
