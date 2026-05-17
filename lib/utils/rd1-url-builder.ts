/**
 * Client utility to build rd1 proxy URLs with encrypted host:port
 * Only encrypts the host:port part to hide from CF inspection
 */

import { encryptPath } from '@/lib/utils/rd1-crypto';

/**
 * Build an rd1 proxy URL with encrypted host:port
 * Example: buildRd1Url('https://s1.bfllvip.com:443/video/xxx/0000000.ts')
 * Returns: /api/rd1/{encrypted_host_port}/{resource_path}
 */
export function buildRd1Url(targetUrl: string): string {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname;
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    const resourcePath = parsed.pathname.substring(1); // Remove leading /
    const query = parsed.search;
    
    // Only encrypt host:port part
    const hostPort = `${host}:${port}`;
    const encrypted = encryptPath(hostPort);
    
    return `/api/rd1/${encrypted}/${resourcePath}${query}`;
}
