const GRAPH_BASE = 'https://graph.instagram.com';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.error?.message || `Instagram request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function getInstagramInsights(accessToken) {
  const me = await fetchJson(
    `${GRAPH_BASE}/me?fields=user_id,username,account_type,media_count&access_token=${encodeURIComponent(accessToken)}`
  );

  const media = await fetchJson(
    `${GRAPH_BASE}/me/media?fields=id,caption,like_count,comments_count,media_product_type,media_type,timestamp,permalink&limit=10&access_token=${encodeURIComponent(accessToken)}`
  );

  const items = Array.isArray(media?.data) ? media.data : [];
  const totals = items.reduce((acc, item) => {
    acc.likes += Number(item.like_count || 0);
    acc.comments += Number(item.comments_count || 0);
    acc.posts += 1;
    return acc;
  }, { likes: 0, comments: 0, posts: 0 });

  return {
    username: me.username || '',
    accountType: me.account_type || '',
    mediaCount: Number(me.media_count || 0),
    followers: null,
    views: null,
    weekSnapshot: {
      followers: 0,
      posts: totals.posts,
      likes: totals.posts ? Math.round(totals.likes / totals.posts) : 0,
      comments: totals.posts ? Math.round(totals.comments / totals.posts) : 0,
      shares: 0,
      niche: 'music'
    },
    recentMedia: items.map((item) => ({
      id: item.id,
      caption: item.caption || '',
      like_count: Number(item.like_count || 0),
      comments_count: Number(item.comments_count || 0),
      media_type: item.media_type || '',
      media_product_type: item.media_product_type || '',
      timestamp: item.timestamp || '',
      permalink: item.permalink || ''
    }))
  };
}
