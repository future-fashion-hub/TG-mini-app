/**
 * Shared mutable gyroscope state.
 * Written by the `deviceorientation` handler in App.tsx,
 * read by every WaterCanvas instance each frame.
 */
export const waterTilt = {
  /** Smoothed tilt value, roughly −10 … 10 */
  value: 0,
  /** Impulse boost 0 … 1+ that decays over time */
  boost: 0,
}
