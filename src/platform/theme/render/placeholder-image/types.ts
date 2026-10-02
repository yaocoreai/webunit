export type PlaceholderImageName = 'image' | 'product' | 'avatar' | 'article' | 'collection';

export type PlaceholderImageOptions = Readonly<{
  width?: number;
  height?: number;
  backgroundColor?: string;
  foregroundColor?: string;
}>;

export type PlaceholderImageDefinition = Readonly<{
  width: number;
  height: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  body: string;
}>;
