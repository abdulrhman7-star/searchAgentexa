/**
 * Netlify Function: gofile-search.js
 * 
 * Provides server-side search querying the Gofile REST API:
 * 1. If folderId + token are configured: Queries Gofile's GET /contents/search
 * 2. If token only is provided: Resolves account rootFolder first, then searches
 * 3. Fallback / Public mode: Searches indexed public gofile.io files via Exa API
 */

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const q =
      event.queryStringParameters?.q ||
      event.queryStringParameters?.query ||
      '';

    if (!q || !q.trim()) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'error',
          message: 'Search query parameter (q) is required',
        }),
      };
    }

    const trimmedQuery = q.trim();
    const token =
      event.queryStringParameters?.token ||
      process.env.GOFILE_API_TOKEN ||
      '';
    let folderId =
      event.queryStringParameters?.folderId ||
      process.env.GOFILE_FOLDER_ID ||
      '';

    let results = [];
    let searchMode = 'direct_api';
    let note = '';

    // 1. Direct Gofile API search if token is provided
    if (token) {
      try {
        // If folderId is not provided, try to resolve the account rootFolder
        if (!folderId) {
          try {
            const accRes = await fetch('https://api.gofile.io/accounts/getid', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const accData = await accRes.json();
            if (accData.status === 'ok' && accData.data?.id) {
              const detailsRes = await fetch(
                `https://api.gofile.io/accounts/${accData.data.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const detailsData = await detailsRes.json();
              if (detailsData.status === 'ok' && detailsData.data?.rootFolder) {
                folderId = detailsData.data.rootFolder;
              }
            }
          } catch (accErr) {
            console.warn('[Gofile Netlify] Failed to auto-resolve root folder:', accErr.message);
          }
        }

        if (folderId) {
          const searchUrl = `https://api.gofile.io/contents/search?contentId=${encodeURIComponent(
            folderId
          )}&searchedString=${encodeURIComponent(trimmedQuery)}`;

          const gofileRes = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });

          const gofileData = await gofileRes.json();

          if (gofileData.status === 'ok' && gofileData.data) {
            const rawContents = gofileData.data;
            const items = Object.values(rawContents);

            results = items.map((item) => {
              const shareCode = item.code || item.id;
              const downloadUrl =
                item.directLink ||
                item.downloadPage ||
                (shareCode ? `https://gofile.io/d/${shareCode}` : '');

              return {
                id: item.id || `gofile_${Math.random().toString(36).slice(2, 9)}`,
                title: item.name || 'Gofile Content',
                name: item.name || 'Gofile Content',
                url: downloadUrl,
                downloadUrl: downloadUrl,
                type: item.type || (item.mimetype?.startsWith('video/') ? 'video' : 'file'),
                size: item.size || 0,
                sizeFormatted: formatBytes(item.size || 0),
                mimetype: item.mimetype || 'application/octet-stream',
                createTime: item.createTime || Math.floor(Date.now() / 1000),
                provider: 'gofile',
                isPublicFileHost: true,
                fileHostName: 'Gofile API',
              };
            });

            note = `Found ${results.length} item(s) in Gofile folder: ${folderId}`;
          } else {
            note = `Gofile API response: ${gofileData.status || 'unknown'}. Falling back to public web index.`;
            searchMode = 'public_fallback';
          }
        } else {
          note = 'No folderId provided and rootFolder could not be resolved. Falling back to public web index.';
          searchMode = 'public_fallback';
        }
      } catch (directErr) {
        console.warn('[Gofile Netlify] Direct search error:', directErr.message);
        searchMode = 'public_fallback';
        note = `Direct Gofile API call failed (${directErr.message}). Falling back to public web index.`;
      }
    } else {
      searchMode = 'public_fallback';
      note = 'No GOFILE_API_TOKEN set. Searching public indexed Gofile links via neural search.';
    }

    // 2. Fallback / Public mode: Search indexed public gofile.io links via Exa
    if (results.length === 0 && (process.env.EXA_API_KEY || process.env.VITE_EXA_API_KEY)) {
      try {
        const exaKey = process.env.EXA_API_KEY || process.env.VITE_EXA_API_KEY;
        const exaRes = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': exaKey,
          },
          body: JSON.stringify({
            query: trimmedQuery,
            includeDomains: ['gofile.io'],
            numResults: 15,
            useAutoprompt: true,
            type: 'neural',
            contents: {
              text: { maxCharacters: 300 },
              highlights: { numSentences: 1 },
            },
          }),
        });

        const exaData = await exaRes.json();
        if (exaData.results && Array.isArray(exaData.results)) {
          results = exaData.results.map((r) => ({
            id: r.id || r.url,
            title: r.title || `Gofile Shared File (${trimmedQuery})`,
            name: r.title || 'Shared Gofile Archive',
            url: r.url,
            downloadUrl: r.url,
            snippet: r.text || r.highlights?.[0] || '',
            type: r.url.includes('/d/') ? 'file' : 'folder',
            provider: 'gofile',
            isPublicFileHost: true,
            fileHostName: 'Gofile',
          }));
        }
      } catch (exaErr) {
        console.warn('[Gofile Netlify] Exa fallback error:', exaErr.message);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'ok',
        query: trimmedQuery,
        searchMode,
        note,
        total: results.length,
        results,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'error',
        message: error.message || 'Internal server error in gofile-search function',
      }),
    };
  }
};

export default handler;
