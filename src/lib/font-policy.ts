export type FontPolicy = {
  readonly sansFamily: string;
  readonly serifFamily: string;
  readonly monoFamily: string;
  readonly lineHeight: {
    readonly title: number;
    readonly body: number;
    readonly caption: number;
  };
  readonly letterSpacing: "0em";
  readonly bundledFontFiles: readonly string[];
};

const BUNDLED_FONT_FILES: readonly string[] = [];

export const FONT_POLICY: FontPolicy = Object.freeze({
  sansFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  serifFamily: 'ui-serif, Georgia, "Times New Roman", "AppleMyungjo", "Noto Serif KR", serif',
  monoFamily:
    'ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  lineHeight: Object.freeze({
    title: 1.16,
    body: 1.42,
    caption: 1.32,
  }),
  letterSpacing: "0em",
  bundledFontFiles: BUNDLED_FONT_FILES,
});
