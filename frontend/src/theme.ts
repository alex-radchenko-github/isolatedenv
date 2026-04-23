import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  // Font family is set via next/font in layout.tsx (self-hosted, preloaded, zero CLS).
  // Mantine inherits from <body className={inter.className}> automatically.
  defaultRadius: "md",
  cursorType: "pointer",
  focusRing: "auto",
  respectReducedMotion: true,
  components: {
    Button: {
      defaultProps: {
        loaderProps: { type: "dots" },
      },
    },
    Card: {
      defaultProps: {
        shadow: "sm",
      },
    },
    Anchor: {
      defaultProps: {
        underline: "hover",
      },
    },
  },
});
