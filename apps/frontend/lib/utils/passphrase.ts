const adjectives = [
  'brave', 'bright', 'calm', 'clever', 'cool', 'eager', 'fair', 'gentle', 'happy', 'kind',
  'lively', 'nice', 'proud', 'quick', 'quiet', 'smart', 'swift', 'warm', 'wise', 'young',
  'bold', 'fresh', 'lucky', 'royal', 'sharp', 'smooth', 'strong', 'sweet', 'wild', 'free'
];

const nouns = [
  'tiger', 'eagle', 'wolf', 'bear', 'lion', 'fox', 'deer', 'hawk', 'owl', 'cat',
  'dog', 'fish', 'bird', 'star', 'moon', 'sun', 'tree', 'rock', 'wind', 'fire',
  'ocean', 'river', 'mountain', 'forest', 'flower', 'crystal', 'diamond', 'gold', 'silver', 'ruby'
];

export function generatePassphrase(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;

  return `${adjective}-${noun}-${number}`;
}