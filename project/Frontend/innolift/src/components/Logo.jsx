// A simple upward-path + node mark — reads as "tracking a trajectory",
// which is literally what the app does. Uses currentColor for the
// strokes/fill so it automatically matches whatever text color the
// surrounding .glyph context already applies (dark on the header's
// green square, white on the gradient footer/landing mark) — no need
// to hardcode a color per context.
function Logo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 17 L9 11 L13 15 L21 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 6 H21 V12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="3" cy="17" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default Logo;
