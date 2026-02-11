export enum Undertone {
  COOL = 'Cool',
  NEUTRAL = 'Neutral',
  WARM = 'Warm'
}

export enum Depth {
  FAIR = 'Fair',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  TAN = 'Tan',
  DEEP = 'Deep'
}

export interface FoundationShade {
  id: number;
  name: string;
  code: string;
  hex: string;
  imageUrl: string;
  depth: Depth;
  undertone: Undertone;
  description: string;
}

export interface MatchResult {
  primaryMatch: FoundationShade;
  range: FoundationShade[];
  analysis: string;
}
