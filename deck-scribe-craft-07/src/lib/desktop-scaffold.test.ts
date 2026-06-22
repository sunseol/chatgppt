import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

type PackageJson = {
  readonly scripts?: Record<string, string>;
};

type TauriConfig = {
  readonly productName?: string;
  readonly identifier?: string;
  readonly build?: {
    readonly beforeDevCommand?: string;
    readonly beforeBuildCommand?: string;
    readonly devUrl?: string;
    readonly frontendDist?: string;
  };
  readonly bundle?: {
    readonly active?: boolean;
    readonly targets?: readonly string[];
    readonly icon?: readonly string[];
  };
};

describe("desktop scaffold", () => {
  test("declares Tauri, Rust, and combined quality gate scripts", () => {
    const pkg = readJson<PackageJson>("../../package.json");

    expect(pkg.scripts?.["tauri:dev"]).toBe("tauri dev");
    expect(pkg.scripts?.["tauri:build"]).toBe("tauri build");
    expect(pkg.scripts?.["rust:fmt"]?.includes("src-tauri/Cargo.toml")).toBe(true);
    expect(pkg.scripts?.["rust:clippy"]?.includes("-D warnings")).toBe(true);
    expect(pkg.scripts?.quality).toBe("bun run quality:ts && bun run quality:rust");
  });

  test("configures the desktop app against the sanitized package build", () => {
    const config = readJson<TauriConfig>("../../src-tauri/tauri.conf.json");

    expect(config.productName).toBe("DeckForge");
    expect(config.identifier).toBe("app.deckforge.desktop");
    expect(config.build?.beforeDevCommand).toBe("bun run dev");
    expect(config.build?.beforeBuildCommand).toBe("bun run build:package");
    expect(config.build?.devUrl).toBe("http://localhost:5173");
    expect(config.build?.frontendDist).toBe("../dist/client");
    expect(config.bundle?.active).toBe(true);
    expect(config.bundle?.targets?.includes("dmg")).toBe(true);
    expect(config.bundle?.icon).toEqual(["icons/icon.png"]);
  });

  test("prerenders the root HTML shell required by the Tauri bundle", () => {
    const viteConfig = readText("../../vite.config.ts");

    expect(viteConfig.includes("prerender")).toBe(true);
    expect(viteConfig.includes('outputPath: "/index.html"')).toBe(true);
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;
}

function readText(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}
