const API_BASE = 'https://open.tiktokapis.com/v2';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.error?.message || `TikTok request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function getTikTokInsights(accessToken) {
  const userInfo = await fetchJson(
    `${API_BASE}/user/info/?fields=open_id,union_id,display_name,username,avatar_url,bio_description,profile_deep_link,follower_count,following_count,likes_count,video_count`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const videos = await fetchJson(`${API_BASE}/video/list/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ max_count: 10 })
  });

  const items = Array.isArray(videos?.data?.videos) ? videos.data.videos : [];
  const totals = items.reduce((acc, item) => {
    acc.views += Number(item.view_count || 0);
    acc.likes += Number(item.like_count || 0);
    acc.comments += Number(item.comment_count || 0);
    acc.shares += Number(item.share_count || 0);
    acc.posts += 1;
    return acc;
  }, { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });

  const u = userInfo?.data?.user || {};

  return {
    username: u.username || '',
    displayName: u.display_name || '',
    followerCount: Number(u.follower_count || 0),
    likesCount: Number(u.likes_count || 0),
    videoCount: Number(u.video_count || 0),
    weekSnapshot: {
      followers: Number(u.follower_count || 0),
      posts: totals.posts,
      likes: totals.posts ? Math.round(totals.likes / totals.posts) : 0,
      comments: totals.posts ? Math.round(totals.comments / totals.posts) : 0,
      shares: totals.posts ? Math.round(totals.shares / totals.posts) : 0,
      views: totals.posts ? Math.round(totals.views / totals.posts) : 0,
      niche: 'music'
    },
    recentVideos: items.map((item) => ({
      id: item.id,
      title: item.title || '',
      view_count: Number(item.view_count || 0),
      like_count: Number(item.like_count || 0),
      comment_count: Number(item.comment_count || 0),
      share_count: Number(item.share_count || 0),
      create_time: item.create_time || ''
    }))
  };
}
