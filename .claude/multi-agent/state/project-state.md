language: TypeScript/JavaScript
package_manager: npm
test_command:     test: vitest run
lint_command:     lint: eslint .
build_command:     build: prisma generate && next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
git_branch: main
git_status: ?? .claude/multi-agent/state/
?? data-search/
last_commits: 534f06f chore: remove URPE/urpeailab references, use personal contact
3c18b90 feat(seo): per-workspace generateMetadata + richer global JSON-LD
ba8296b feat(seo): activate Google Search Console + Bing Webmaster verification
1a04e67 feat(legal+seo): ToS, OG image redesign, Bing Webmaster Tools setup
fd59607 fix(seo): update canonical domain to axiom-simulator.vercel.app
