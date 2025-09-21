export const memes = [
  {
    slug: '9gag-classic-fail',
    type: 'twitter',
    url: 'https://twitter.com/9GAG/status/1777670259229890722',
    title: 'Classic 9GAG Fail Compilation',
    description: '순간적으로 빵 터지는 9GAG 명장면 모음',
    thumbnail: 'https://images.pexels.com/photos/2775156/pexels-photo-2775156.jpeg?auto=compress&cs=tinysrgb&w=640',
    orientation: 'landscape',
    source: 'Twitter',
    publishedAt: '2024-03-12T08:10:00Z',
    likes: 18400,
    views: 523000
  },
  {
    slug: 'piano-cat-serenade',
    type: 'video',
    src: 'https://videos.pexels.com/video-files/856176/856176-hd_1280_720_30fps.mp4',
    poster: 'https://images.pexels.com/photos/856177/pexels-photo-856177.jpeg?auto=compress&cs=tinysrgb&w=640',
    title: '피아노 치는 고양이의 세레나데',
    description: '건반 위를 누비는 고양이와 함께 감성 충만한 순간',
    thumbnail: 'https://images.pexels.com/photos/856177/pexels-photo-856177.jpeg?auto=compress&cs=tinysrgb&w=640',
    orientation: 'portrait',
    durationSeconds: 64,
    source: 'Pexels Videos',
    publishedAt: '2024-04-04T11:45:00Z',
    likes: 9800,
    views: 74200
  },
  {
    slug: 'memefolder-thread',
    type: 'twitter',
    url: 'https://twitter.com/memefolder/status/1703152620371964170',
    title: '이제는 전설이 된 트윗 쓰레드',
    description: '트위터 밈 모음집으로 한 번 더 웃어보자',
    thumbnail: 'https://images.pexels.com/photos/4462785/pexels-photo-4462785.jpeg?auto=compress&cs=tinysrgb&w=640',
    orientation: 'portrait',
    source: 'Twitter',
    publishedAt: '2024-02-27T15:00:00Z',
    likes: 36700,
    views: 1120000
  },
  {
    slug: 'sunglasses-doggo',
    type: 'video',
    src: 'https://videos.pexels.com/video-files/2825696/2825696-hd_1280_720_30fps.mp4',
    poster: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=640',
    title: '선글라스 낀 강아지의 여름 준비',
    description: '바다를 향해 신나게 질주하는 멋쟁이 강아지',
    thumbnail: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=640',
    orientation: 'landscape',
    durationSeconds: 82,
    source: 'Pexels Videos',
    publishedAt: '2024-05-01T09:20:00Z',
    likes: 12500,
    views: 95600
  },
];

export function getMemeBySlug(slug) {
  return memes.find((meme) => meme.slug === slug);
}
