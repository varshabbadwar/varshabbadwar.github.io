const corsHeaders = origin => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin !== env.ALLOWED_ORIGIN) return new Response('Origin not allowed', { status: 403 });
    const headers = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/upload') return json({ error: 'Not found' }, 404, headers);

    try {
      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!idToken) return json({ error: 'Authentication required.' }, 401, headers);

      // Ask Firebase Identity Toolkit to validate the Firebase ID token.
      const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (!verifyResponse.ok) return json({ error: 'Invalid or expired Firebase session.' }, 401, headers);
      const verified = await verifyResponse.json();
      const user = verified.users?.[0];
      if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'Administrator access required.' }, 403, headers);

      const body = await request.json();
      const { fileName, contentType, contentBase64, year, category } = body;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(contentType)) return json({ error: 'Only JPG, PNG and WebP files are allowed.' }, 400, headers);
      if (typeof contentBase64 !== 'string' || contentBase64.length > 7_000_000) return json({ error: 'Image is too large. Maximum upload is 5 MB.' }, 413, headers);
      if (!/^\d{4}$/.test(String(year)) || !/^(gallery|awards)$/.test(String(category))) return json({ error: 'Invalid upload metadata.' }, 400, headers);
      const safeName = String(fileName || 'photo').toLowerCase().replace(/[^a-z0-9.-]/g, '-').slice(-90);
      const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
      const path = `images/gallery/${year}/${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}.${extension}`;
      const githubUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
      const uploadResponse = await fetch(githubUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: `Add portfolio image: ${safeName}`, content: contentBase64, branch: env.GITHUB_BRANCH || 'main' })
      });
      const result = await uploadResponse.json();
      if (!uploadResponse.ok) return json({ error: result.message || 'GitHub upload failed.' }, 502, headers);
      const imageUrl = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${env.GITHUB_BRANCH || 'main'}/${path}`;
      return json({ imageUrl, path, commit: result.commit?.sha || null }, 200, headers);
    } catch (error) {
      return json({ error: error.message || 'Unexpected upload error.' }, 500, headers);
    }
  }
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
