// Adjectives and nouns for generating readable passphrases
const adjectives = [
  'brave', 'bright', 'calm', 'clever', 'cool', 'eager', 'fast', 'gentle',
  'happy', 'kind', 'lucky', 'nice', 'quick', 'smart', 'strong', 'swift',
  'wise', 'bold', 'clean', 'fresh', 'good', 'great', 'pure', 'rich',
  'safe', 'warm', 'wild', 'young', 'alert', 'exact', 'fair', 'fine'
];

const nouns = [
  'tiger', 'eagle', 'dolphin', 'lion', 'bear', 'wolf', 'fox', 'deer',
  'rabbit', 'horse', 'bird', 'fish', 'cat', 'dog', 'owl', 'bee',
  'star', 'moon', 'sun', 'rock', 'tree', 'flower', 'river', 'ocean',
  'mountain', 'cloud', 'wind', 'fire', 'ice', 'snow', 'rain', 'storm'
];

export function generatePassphrase(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);

  return `${adjective}-${noun}-${number}`;
}