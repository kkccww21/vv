import { NextRequest, NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';
import { getRuntimeFeatures } from '@/lib/server/runtime-features';
import { decryptPath } from '@/lib/utils/rd1-crypto';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const runtimeFeatures = getRuntimeFeatures();

    if (!runtimeFeatures.mediaProxyEnabled) {
        return NextResponse.json(
            {
                error: 'External media proxy is disabled on this deployment',
                message: runtimeFeatures.restrictionSummary,
            },
            { status: 403 }
        );
    }

    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];

    if (pathSegments.length < 1) {
        return new NextResponse('Invalid URL format. Expected: /api/rd1/{encrypted_host_port}/{path...}', { status: 400 });
    }

    // First segment is the encrypted host:port
    const encryptedHostPort = pathSegments[0];

    // Validate encrypted string length (must be even for hex, or valid base64url)
    if (!encryptedHostPort || encryptedHostPort.length < 4) {
        return new NextResponse('Invalid encrypted host:port', { status: 400 });
    }

    let rawHostPort: string;
    try {
        rawHostPort = decryptPath(encryptedHostPort);
    } catch (e) {
        console.error('Decryption error:', e);
        return new NextResponse('Invalid encrypted host:port', { status: 400 });
    }

    // Parse host:port
    const colonIndex = rawHostPort.indexOf(':');
    if (colonIndex === -1) {
        return new NextResponse(`Invalid host:port format after decryption: "${rawHostPort}"`, { status: 400 });
    }

    const host = rawHostPort.substring(0, colonIndex);
    const port = rawHostPort.substring(colonIndex + 1);

    // Rest is resource path
    const resourcePath = pathSegments.slice(1).join('/');

    if (!host || !resourcePath) {
        return new NextResponse('Invalid URL format', { status: 400 });
    }

    const protocol = port === '80' ? 'http' : 'https';
    const isDefaultPort = (port === '443' && protocol === 'https') || (port === '80' && protocol === 'http');
    const url = isDefaultPort
        ? `${protocol}://${host}/${resourcePath}`
        : port
            ? `${protocol}://${host}:${port}/${resourcePath}`
            : `${protocol}://${host}/${resourcePath}`;

    try {
        const requestHeaders: Record<string, string> = {};
        const forwardHeaders = ['cookie', 'range'];

        forwardHeaders.forEach(key => {
            const value = request.headers.get(key);
            if (value) requestHeaders[key] = value;
        });

        const response = await fetchWithRetry({ url, request, headers: requestHeaders });

        if (!response.ok) {
            const errorText = await response.text();
            return new NextResponse(errorText || `Upstream error: ${response.status}`, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const contentType = response.headers.get('Content-Type');

        const headers = new Headers();
        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(lowerKey)) {
                headers.set(key, value);
            }
        });

        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse(
            JSON.stringify({
                error: 'Proxy request failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                url: url
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
