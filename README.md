# Linework Studio site

Chinese: [README-zh.md](README-zh.md).

Multiple languages. Content and theme stay apart. Server-rendered, and it deploys to Node, Cloudflare, or a container.

- Multiple languages. Another language covers only the fields that change.
- Content and theme stay apart. Content lives in datas. Presentation lives in theme.
- Meta properties and meta models. Fields and content models are defined first.
- Function compute. Controllers, services, and middleware live in function.
- Search-friendly. Title, description, and structured data, by language, the whole site, a module, or one page.
- Consent included. Privacy choices and the cookie policy sit in the system.
- Injections stay apart from the document. Scripts are not written into the page body.
- Install Node.js and it runs. No third-party service required.
- Deploys to Node, Cloudflare, or a container.
- Server-rendered, and built for speed.

https://github.com/yaocoreai/webunit

Linework Studio. 陈工不摸鱼工作室.

## Layers

- **theme**: how a page is drawn. Templates, sections, layout. Astro and Tailwind.
- **datas**: the site, pages, articles, and translations. English is the default. Chinese is at `/zh`.
- **function**: controllers, services, and middleware.

The runtime sits in `platform`. The content on a page lives in datas.

## Run

Node 24 or newer.

```sh
pnpm install
pnpm dev
```

Theme datas opens at http://localhost:3003.

## Build

```sh
pnpm build
pnpm build:cloudflare
```

Node, and Cloudflare.

## Docs

- Site runtime: [docs/zh/architecture.md](docs/zh/architecture.md)
- Function architecture: [docs/zh/architecture-function.md](docs/zh/architecture-function.md). Feature index: [docs/zh/function.md](docs/zh/function.md)
- Theme architecture: [docs/zh/architecture-theme.md](docs/zh/architecture-theme.md). Datas features are indexed in [docs/zh/theme.md](docs/zh/theme.md)
