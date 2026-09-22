import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import config from "../tailwind.config";

const require = createRequire(import.meta.url);
const palette = config.theme?.extend?.colors as Record<string, string>;
const theme = readFileSync(require.resolve("highlight.js/styles/github-dark.css"), "utf8");
const overrides = readFileSync(new URL("../components/posts/post-card.module.css", import.meta.url), "utf8");

function luminance(hex: string) {
  expect(hex).toMatch(/^#[\da-f]{6}$/i);
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function expectReadable(label: string, foreground: string, background: string) {
  const ratio = contrast(foreground, background);
  expect(ratio, `${label}: ${foreground} sobre ${background} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
}

type Colors = { color?: string; background?: string };

// Resolve as declarações reais do tema e os overrides locais dentro de .codeBlock.
// Seletores compostos/contextuais continuam separados (ex.: meta + keyword).
function codeColors() {
  const base: Colors = {};
  const tokens = new Map<string, Colors>();
  for (const css of [theme, overrides]) {
    postcss.parse(css).walkRules(rule => {
      const declarations: Colors = {};
      rule.walkDecls(declaration => {
        if (declaration.prop === "color") declarations.color = declaration.value;
        if (declaration.prop === "background" || declaration.prop === "background-color") declarations.background = declaration.value;
      });
      for (const rawSelector of rule.selectors) {
        const selector = rawSelector.replace(/:global\(([^)]+)\)/g, "$1").replace(/^\.codeBlock\s+/, "");
        if ([".hljs", ".codeBlock", "code.hljs"].includes(selector)) {
          Object.assign(base, declarations);
        } else if (selector.includes(".hljs-")) {
          tokens.set(selector, { ...tokens.get(selector), ...declarations });
        }
      }
    });
  }
  return { base, tokens };
}

describe("contraste do tema escuro", () => {
  it("mantém texto normal, metadados e links legíveis em todas as superfícies", () => {
    for (const background of ["canvas", "surface", "raised", "inset"]) {
      for (const foreground of ["ink", "muted", "subtle", "accent"]) {
        expectReadable(`${foreground}/${background}`, palette[foreground], palette[background]);
      }
    }
  });

  it("mantém os rótulos brancos dos botões legíveis no estado normal e hover", () => {
    for (const background of ["primary", "primary-hover"]) {
      expectReadable(`botão/${background}`, "#ffffff", palette[background]);
    }
  });

  it("mantém código simples e todos os tokens legíveis, incluindo comentários, headings e diffs", () => {
    const { base, tokens } = codeColors();
    expect(base.color).toBeDefined();
    expect(base.background).toBeDefined();
    expect(tokens.has(".hljs-comment")).toBe(true);
    expect(tokens.has(".hljs-section")).toBe(true);
    // Diffs têm seus próprios fundos: não se pode medir só contra o fundo do pre.
    expect(tokens.get(".hljs-addition")?.background).toBeDefined();
    expect(tokens.get(".hljs-deletion")?.background).toBeDefined();
    expectReadable("código sem token", base.color!, base.background!);
    for (const [selector, colors] of tokens) {
      expectReadable(selector, colors.color ?? base.color!, colors.background ?? base.background!);
    }
  });
});
