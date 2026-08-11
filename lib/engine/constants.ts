import Decimal from "decimal.js";

export const DECIMAL_PRECISION = 50;

Decimal.set({
  precision: DECIMAL_PRECISION,
  rounding: Decimal.ROUND_HALF_UP,
});

export const PHI = new Decimal(
  "1.6180339887498948482045868343656381177203091798058",
);

export const PI = new Decimal(
  "3.1415926535897932384626433832795028841971693993751",
);

export const E = new Decimal(
  "2.7182818284590452353602874713526624977572470937",
);
