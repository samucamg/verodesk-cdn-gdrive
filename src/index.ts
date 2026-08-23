import { Buffer } from 'node:buffer';

export interface Env {
    DB: D1Database;
    UPLOAD_TOKEN: string;
    CDN_BASE_URL?: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
}

const MAX_FILE_SIZE = 1500 * 1024 * 1024; // 1.5GB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp3', 'mp4', 'mkv'];

async function getDriveAccessToken(env: Env): Promise<string | null> {
    const tokenRecord = await env.DB.prepare("SELECT value FROM settings WHERE key = 'gdrive_refresh_token'").first();
    if (!tokenRecord) return null;
    
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: tokenRecord.value as string,
            grant_type: 'refresh_token'
        })
    });
    
    const data = await res.json() as any;
    return data.access_token || null;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff'
        };

        const url = new URL(request.url);

        const checkAuth = (req: Request) => {
            const authHeader = req.headers.get('Authorization');
            return authHeader === `Bearer ${env.UPLOAD_TOKEN}`;
        };

        try {
            if (url.pathname.startsWith('/api/')) {

                if (url.pathname === '/api/auth/google' && request.method === 'GET') {
                    if (!checkAuth(request) && url.searchParams.get('token') !== env.UPLOAD_TOKEN) {
                        return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    }
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.GOOGLE_REDIRECT_URI)}&response_type=code&scope=https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly&access_type=offline&prompt=consent`;
                    return Response.redirect(authUrl, 302);
                }

                if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
                    const code = url.searchParams.get('code');
                    if (!code) return new Response('Codigo nao fornecido', { status: 400 });

                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: env.GOOGLE_CLIENT_ID,
                            client_secret: env.GOOGLE_CLIENT_SECRET,
                            code,
                            grant_type: 'authorization_code',
                            redirect_uri: env.GOOGLE_REDIRECT_URI,
                        })
                    });

                    const tokenData = await tokenResponse.json() as any;
                    if (!tokenData.refresh_token) {
                        return new Response('Falha ao obter refresh_token. Revogue o acesso no Google e tente novamente.', { status: 400 });
                    }

                    await env.DB.prepare(`INSERT INTO settings (key, value) VALUES ('gdrive_refresh_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(tokenData.refresh_token).run();
                    return new Response('Autenticacao concluida com sucesso! Pode fechar esta janela e voltar ao painel.', { headers: { 'Content-Type': 'text/html' } });
                }

                if (url.pathname === '/api/stats' && request.method === 'GET') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    const { results } = await env.DB.prepare("SELECT count(*) as total, COALESCE(sum(file_size), 0) as total_size FROM uploads").all();
                    return new Response(JSON.stringify({ success: true, stats: results[0] }), { headers: defaultHeaders });
                }

                if (url.pathname === '/api/uploads' && request.method === 'GET') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    const project = url.searchParams.get('project');
                    let query = "SELECT * FROM uploads ORDER BY upload_date DESC LIMIT 100";
                    let params: string[] = [];
                    if (project && project !== 'all') {
                        query = "SELECT * FROM uploads WHERE project_key = ? ORDER BY upload_date DESC LIMIT 100";
                        params.push(project);
                    }
                    const { results } = await env.DB.prepare(query).bind(...params).all();
                    return new Response(JSON.stringify({ success: true, uploads: results }), { headers: defaultHeaders });
                }

                // --- INIT CHUNKED UPLOAD ---
                if (url.pathname === '/api/upload/init' && request.method === 'POST') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    
                    const data = await request.json() as any;
                    const project = data.project;
                    const originalName = data.originalName || 'unnamed';
                    const size = parseInt(data.size, 10);

                    if (!project || !/^[a-zA-Z0-9_-]{1,64}$/.test(project)) {
                        return new Response(JSON.stringify({ success: false, error: 'Identificador de projeto invalido' }), { status: 400, headers: defaultHeaders });
                    }
                    if (size > MAX_FILE_SIZE) return new Response(JSON.stringify({ success: false, error: 'Excede o limite permitido (1.5GB)' }), { status: 400, headers: defaultHeaders });

                    const ext = originalName.split('.').pop()?.toLowerCase() || '';
                    if (!ALLOWED_EXTENSIONS.includes(ext)) return new Response(JSON.stringify({ success: false, error: 'Extensao invalida' }), { status: 400, headers: defaultHeaders });

                    const safeName = originalName.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9_-]/g, '-');
                    const newName = `${safeName}_${Date.now()}.${ext}`;
                    
                    const mimeType = data.mimeType || 'application/octet-stream';
                    
                    const accessToken = await getDriveAccessToken(env);
                    if (!accessToken) {
                        return new Response(JSON.stringify({ success: false, error: 'Google Drive nao autenticado.' }), { status: 401, headers: defaultHeaders });
                    }

                    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                            'X-Upload-Content-Type': mimeType,
                            'X-Upload-Content-Length': size.toString()
                        },
                        body: JSON.stringify({ name: newName, mimeType })
                    });

                    if (!initRes.ok) {
                        const errText = await initRes.text();
                        return new Response(JSON.stringify({ success: false, error: `Falha ao abrir sessao no Drive (HTTP ${initRes.status})` }), { status: 502, headers: defaultHeaders });
                    }

                    const uploadUrl = initRes.headers.get('Location');
                    if (!uploadUrl) return new Response(JSON.stringify({ success: false, error: 'API do Drive nao retornou Location' }), { status: 502, headers: defaultHeaders });

                    const sessionId = Buffer.from(uploadUrl).toString('base64');
                    return new Response(JSON.stringify({ success: true, sessionId, newName, ext, mimeType }), { headers: defaultHeaders });
                }

                // --- TRANSFER CHUNKS ---
                if (url.pathname === '/api/upload/chunk' && request.method === 'PUT') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    
                    const sessionId = request.headers.get('x-session-id');
                    const contentRange = request.headers.get('content-range');
                    const project = request.headers.get('x-project');
                    const originalName = decodeURIComponent(request.headers.get('x-original-name') || '');
                    const newName = request.headers.get('x-new-name');
                    const ext = request.headers.get('x-ext');
                    const mimeType = request.headers.get('x-mime-type');
                    const contentLength = request.headers.get('content-length') || '';

                    if (!sessionId || !contentRange || !project || !newName) {
                        return new Response(JSON.stringify({ success: false, error: 'Headers de chunk ausentes' }), { status: 400, headers: defaultHeaders });
                    }

                    const driveUrl = Buffer.from(sessionId, 'base64').toString('utf-8');

                    // CORRECAO: duplex: 'half' obrigatorio para bypass de ReadableStream
                    const driveRes = await fetch(driveUrl, {
                        method: 'PUT',
                        headers: { 
                            'Content-Range': contentRange,
                            'Content-Length': contentLength
                        },
                        body: request.body,
                        duplex: 'half'
                    } as RequestInit);

                    if (driveRes.status === 308) {
                        return new Response(JSON.stringify({ success: true, status: 'uploading' }), { status: 200, headers: defaultHeaders });
                    }

                    if (driveRes.ok) {
                        const driveData = await driveRes.json() as any;
                        const driveFileId = driveData.id;
                        const totalSizeMatch = contentRange.match(/\/(\d+)$/);
                        const totalSize = totalSizeMatch ? parseInt(totalSizeMatch[1], 10) : 0;

                        await env.DB.prepare(
                            `INSERT INTO uploads (project_key, project_name, original_name, file_name, file_size, file_extension, mime_type, drive_file_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                        ).bind(
                            project, project, originalName, newName, totalSize, ext, mimeType, driveFileId, 'admin'
                        ).run();

                        return new Response(JSON.stringify({ success: true, urls: { cloudflare: `/${newName}` } }), { headers: defaultHeaders });
                    }

                    const errText = await driveRes.text();
                    return new Response(JSON.stringify({ success: false, error: `Falha Drive PUT (HTTP ${driveRes.status}): ${errText}` }), { status: 502, headers: defaultHeaders });
                }

                if (url.pathname === '/api/uploads' && request.method === 'PUT') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    const data = await request.json() as any;
                    const { id, new_name } = data;
                    
                    if (!id || !new_name) return new Response(JSON.stringify({ success: false, error: 'Dados invalidos' }), { status: 400, headers: defaultHeaders });

                    const safeNewName = new_name.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    if (!safeNewName) return new Response(JSON.stringify({ success: false, error: 'Nome de arquivo invalido' }), { status: 400, headers: defaultHeaders });

                    const fileRecord = await env.DB.prepare("SELECT * FROM uploads WHERE id = ?").bind(id).first() as any;
                    if (!fileRecord) return new Response(JSON.stringify({ success: false, error: 'Arquivo nao encontrado' }), { status: 404, headers: defaultHeaders });

                    const newFileName = `${safeNewName}.${fileRecord.file_extension}`;

                    const accessToken = await getDriveAccessToken(env);
                    if (!accessToken) return new Response(JSON.stringify({ success: false, error: 'Google Drive nao autenticado' }), { status: 502, headers: defaultHeaders });

                    const patchUrl = `https://www.googleapis.com/drive/v3/files/${fileRecord.drive_file_id}`;
                    const patchRes = await fetch(patchUrl, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newFileName })
                    });
                    
                    if (!patchRes.ok) return new Response(JSON.stringify({ success: false, error: `Falha no Drive PATCH (HTTP ${patchRes.status})` }), { status: 502, headers: defaultHeaders });
                    
                    await env.DB.prepare(`UPDATE uploads SET original_name = ?, file_name = ? WHERE id = ?`).bind(newFileName, newFileName, id).run();
                    return new Response(JSON.stringify({ success: true }), { headers: defaultHeaders });
                }

                if (url.pathname === '/api/uploads' && request.method === 'DELETE') {
                    if (!checkAuth(request)) return new Response(JSON.stringify({ success: false, error: 'Nao autorizado' }), { status: 401, headers: defaultHeaders });
                    const data = await request.json() as any;
                    if (!data.id) return new Response(JSON.stringify({ success: false, error: 'ID invalido' }), { status: 400, headers: defaultHeaders });

                    const fileRecord = await env.DB.prepare("SELECT * FROM uploads WHERE id = ?").bind(data.id).first() as any;
                    if (!fileRecord) return new Response(JSON.stringify({ success: false, error: 'Nao encontrado' }), { status: 404, headers: defaultHeaders });

                    const accessToken = await getDriveAccessToken(env);
                    if (!accessToken) return new Response(JSON.stringify({ success: false, error: 'Google Drive nao autenticado' }), { status: 502, headers: defaultHeaders });

                    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileRecord.drive_file_id}`;
                    const delRes = await fetch(driveUrl, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } });

                    if (delRes.ok || delRes.status === 404) {
                        await env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(data.id).run();
                        return new Response(JSON.stringify({ success: true }), { headers: defaultHeaders });
                    }
                    return new Response(JSON.stringify({ success: false, error: `Falha Drive DELETE (HTTP ${delRes.status})` }), { status: 500, headers: defaultHeaders });
                }

                return new Response(JSON.stringify({ error: "Endpoint invalido" }), { status: 404, headers: defaultHeaders });
            }

            if (request.method === 'GET') {
                if (['/', '/index.html', '/gallery.html', '/auth.js'].includes(url.pathname)) {
                     return new Response('Asset estatico nao encontrado ou regras mal configuradas.', { status: 404 });
                }
                
                const fileName = url.pathname.substring(1);
                if (!fileName) return new Response('Bad Request', { status: 400 });

                const fileRecord = await env.DB.prepare("SELECT drive_file_id, mime_type FROM uploads WHERE file_name = ?").bind(fileName).first() as any;
                
                if (!fileRecord) return new Response('Arquivo nao encontrado no D1', { status: 404 });

                const accessToken = await getDriveAccessToken(env);
                if (!accessToken) return new Response('CDN nao autenticada com o Google Drive', { status: 500 });

                const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileRecord.drive_file_id}?alt=media`;
                
                const reqHeaders: Record<string, string> = { 'Authorization': `Bearer ${accessToken}` };
                const rangeHeader = request.headers.get('Range');
                if (rangeHeader) reqHeaders['Range'] = rangeHeader;

                const driveReq = new Request(driveUrl, { method: 'GET', headers: reqHeaders });
                const driveRes = await fetch(driveReq);

                if (!driveRes.ok) return new Response(`Erro ao buscar arquivo no upstream: HTTP ${driveRes.status}`, { status: 502 });

                const response = new Response(driveRes.body, driveRes);
                response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                response.headers.set('Access-Control-Allow-Origin', '*');
                response.headers.set('Content-Type', fileRecord.mime_type || 'application/octet-stream');
                
                return response;
            }

            return new Response('Metodo nao permitido', { status: 405 });
        } catch (err: any) {
            return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: defaultHeaders });
        }
    }
};
