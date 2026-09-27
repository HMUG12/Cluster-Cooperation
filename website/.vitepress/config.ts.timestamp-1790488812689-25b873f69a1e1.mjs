// website/.vitepress/config.ts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { withMermaid } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/vitepress-plugin-mermaid@2._4e5e1d2dbd0e712c5a716bdb24f56ddf/node_modules/vitepress-plugin-mermaid/dist/vitepress-plugin-mermaid.es.mjs";

// website/.vitepress/code-groups.ts
function codeGroupFallbackHead(mpa) {
  return mpa ? [["style", {}, `
.vp-code-group .tabs, .vp-code-group button.copy { display: none; }
.vp-code-group .blocks > div { display: block; }
`]] : [];
}
function isolateCodeGroupRadios(md) {
  const render = md.renderer.rules["container_code-group_open"];
  if (render === void 0) throw new Error("VitePress Markdown renderer is missing the code-group opening rule.");
  md.renderer.rules["container_code-group_open"] = (...args) => {
    const html = render(...args);
    const opening = '<div class="tabs">';
    const closing = '</div><div class="blocks">';
    if (!html.includes(opening) || !html.includes(closing)) {
      throw new Error("VitePress code-group markup does not contain the expected tab strip.");
    }
    return html.replace(opening, '<form class="tabs" @submit.prevent>').replace(closing, '</form><div class="blocks">');
  };
}

// website/docs.ts
function localized(value, locale) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value[locale] : value;
}
function mirroredPages(pages) {
  return pages.flatMap((page) => ["root", "en"].map((locale) => {
    const aliases = page.sourceAliases === void 0 ? void 0 : Array.isArray(page.sourceAliases) ? page.sourceAliases : page.sourceAliases[locale];
    return {
      locale,
      contentLocale: localized(page.contentLocale, locale),
      source: localized(page.source, locale),
      route: locale === "root" ? page.route : `en/${page.route}`,
      label: page.label[locale],
      sidebar: page.sidebar[locale],
      section: page.section[locale],
      order: page.order,
      ...page.outline === void 0 ? {} : { outline: page.outline },
      ...aliases === void 0 ? {} : { sourceAliases: aliases }
    };
  }));
}
function pairedPages(pages) {
  return mirroredPages(pages.map((page) => {
    const chineseSource = page.source.replace(/\.md$/, ".zh.md");
    const sharedAliases = page.sourceAliases ?? [];
    return {
      ...page,
      source: { root: chineseSource, en: page.source },
      contentLocale: { root: "zh-CN", en: "en-US" },
      sourceAliases: {
        root: [...sharedAliases, page.source],
        en: [...sharedAliases, chineseSource]
      }
    };
  }));
}
var homeAndGuide = pairedPages([
  {
    source: "docs/user/index.md",
    route: "index.md",
    label: { root: "DeepSeek Harness", en: "DeepSeek Harness" },
    sidebar: { root: null, en: null },
    section: { root: "\u9996\u9875", en: "Home" },
    order: 0
  },
  {
    source: "docs/user/guide/index.md",
    route: "guide/quickstart.md",
    label: { root: "\u4F7F\u7528 Web UI", en: "Use the Web UI" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u5165\u95E8", en: "Guide" },
    order: 1,
    sourceAliases: ["docs/user/guide"]
  },
  {
    source: "docs/user/guide/providers.md",
    route: "guide/providers.md",
    label: { root: "\u914D\u7F6E\u6A21\u578B", en: "Configure models" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u5165\u95E8", en: "Guide" },
    order: 2
  },
  {
    source: "docs/user/guide/network-proxy.md",
    route: "guide/network-proxy.md",
    label: { root: "\u7F51\u7EDC\u4EE3\u7406", en: "Network proxy" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u5165\u95E8", en: "Guide" },
    order: 3
  },
  {
    source: "docs/user/guide/python-sdk.md",
    route: "guide/python-sdk.md",
    label: { root: "Python", en: "Python" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "SDK", en: "SDK" },
    order: 1
  },
  {
    source: "docs/user/guide/github-review.md",
    route: "guide/github-review.md",
    label: { root: "GitHub \u8BC4\u5BA1\u4F1A\u8BDD", en: "GitHub review sessions" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u81EA\u52A8\u5316", en: "Automation" },
    order: 1
  },
  {
    source: "docs/user/guide/schedule.md",
    route: "guide/schedule.md",
    label: { root: "\u4F1A\u8BDD\u5185\u63D0\u9192", en: "Session reminders" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u81EA\u52A8\u5316", en: "Automation" },
    order: 2
  },
  {
    source: "docs/user/guide/mcp-memory.md",
    route: "guide/mcp-memory.md",
    label: { root: "\u8BB0\u5FC6 MCP", en: "Memory MCP" },
    sidebar: { root: "zh-guide", en: "en-guide" },
    section: { root: "\u96C6\u6210", en: "Integrations" },
    order: 1
  }
]);
var develop = pairedPages([
  {
    source: "docs/user/develop/basic/index.md",
    route: "develop/basic/index.md",
    label: { root: "\u7B2C\u4E00\u4E2A Harness \u63D2\u4EF6", en: "Your first Harness plugin" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u57FA\u7840", en: "Basics" },
    order: 1,
    sourceAliases: ["docs/user/develop/basic"]
  },
  {
    source: "docs/user/develop/basic/tool.md",
    route: "develop/basic/tool.md",
    label: { root: "\u5F00\u53D1\u4E00\u4E2A Tool", en: "Build a tool" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u57FA\u7840", en: "Basics" },
    order: 2
  },
  {
    source: "docs/user/develop/basic/config.md",
    route: "develop/basic/config.md",
    label: { root: "\u63D2\u4EF6\u914D\u7F6E", en: "Plugin configuration" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u57FA\u7840", en: "Basics" },
    order: 3
  },
  {
    source: "docs/user/develop/basic/publish.md",
    route: "develop/basic/publish.md",
    label: { root: "\u6253\u5305\u4E0E\u5B89\u88C5\u63D2\u4EF6", en: "Package and install" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u57FA\u7840", en: "Basics" },
    order: 4
  },
  {
    source: "docs/user/develop/framework/index.md",
    route: "develop/framework/index.md",
    label: { root: "\u63D2\u4EF6\u4E0E\u751F\u547D\u5468\u671F", en: "Plugin lifecycle" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u6846\u67B6\u80FD\u529B", en: "Framework" },
    order: 1,
    sourceAliases: ["docs/user/develop/framework"]
  },
  {
    source: "docs/user/develop/framework/service.md",
    route: "develop/framework/service.md",
    label: { root: "\u670D\u52A1\u4E0E\u4F9D\u8D56", en: "Services and dependencies" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u6846\u67B6\u80FD\u529B", en: "Framework" },
    order: 2
  },
  {
    source: "docs/user/develop/framework/events.md",
    route: "develop/framework/events.md",
    label: { root: "\u4E8B\u4EF6\u7CFB\u7EDF", en: "Event system" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u6846\u67B6\u80FD\u529B", en: "Framework" },
    order: 3
  },
  {
    source: "docs/user/develop/practice/index.md",
    route: "develop/practice/index.md",
    label: { root: "\u80FD\u529B\u7684\u4E09\u5C42\u62C6\u5206", en: "Capability layering" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u5B9E\u6218", en: "Practice" },
    order: 1,
    sourceAliases: ["docs/user/develop/practice"]
  },
  {
    source: "docs/user/develop/practice/llm-adapter.md",
    route: "develop/practice/llm-adapter.md",
    label: { root: "LLM \u9002\u914D\u5668", en: "LLM adapter" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u5B9E\u6218", en: "Practice" },
    order: 2
  },
  {
    source: "docs/user/develop/practice/dynamic-cordis.md",
    route: "develop/practice/dynamic-cordis.md",
    label: { root: "\u6301\u4E45\u5316 Harness \u63D2\u4EF6", en: "Persistent Harness plugins" },
    sidebar: { root: "zh-develop", en: "en-develop" },
    section: { root: "\u5B9E\u6218", en: "Practice" },
    order: 3
  }
]);
var cordisTutorial = pairedPages([
  ["index.md", "\u603B\u89C8", "Overview"],
  ["01-first-plugin.md", "1. \u7B2C\u4E00\u4E2A\u63D2\u4EF6", "1. Your first plugin"],
  ["02-lifecycle-and-effects.md", "2. \u751F\u547D\u5468\u671F\u4E0E\u526F\u4F5C\u7528", "2. Lifecycle and effects"],
  ["03-services.md", "3. \u670D\u52A1", "3. Services"],
  ["04-events.md", "4. \u4E8B\u4EF6", "4. Events"],
  ["05-config.md", "5. \u914D\u7F6E", "5. Configuration"],
  ["06-composition-and-hmr.md", "6. \u7EC4\u5408\u4E0E\u70ED\u91CD\u8F7D", "6. Composition and HMR"],
  ["07-into-the-harness.md", "7. \u8FDB\u5165 Harness", "7. Into the harness"]
].map(([file, rootLabel, enLabel], order) => ({
  source: `docs/cordis-tutorial/${file}`,
  route: `develop/cordis-tutorial/${file}`,
  label: { root: rootLabel, en: enLabel },
  sidebar: { root: "zh-develop", en: "en-develop" },
  section: { root: "Cordis \u6846\u67B6\u6559\u7A0B", en: "Cordis framework tutorial" },
  order,
  ...file === "index.md" ? { sourceAliases: ["docs/cordis-tutorial"] } : {}
})));
var cordisPrimerReference = pairedPages([
  {
    source: "docs/cordis-primer.md",
    route: "reference/cordis-primer.md",
    label: { root: "Cordis \u5165\u95E8", en: "Cordis primer" },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "\u6982\u5FF5", en: "Concepts" },
    order: 1
  }
]);
var subsystemGroups = [
  ["\u603B\u89C8", "Overview", [
    ["README.md", "\u5B50\u7CFB\u7EDF", "Subsystems"]
  ]],
  ["\u5185\u6838\u4E0E\u4F5C\u7528\u57DF", "Core and scopes", [
    ["core.md", "\u6838\u5FC3", "Core"],
    ["scope.md", "\u4F5C\u7528\u57DF", "Scopes"],
    ["invariants.md", "\u8FD0\u884C\u65F6\u4E0D\u53D8\u5F0F", "Runtime invariants"]
  ]],
  ["\u4F1A\u8BDD\u4E0E\u6301\u4E45\u5316", "Sessions and persistence", [
    ["session.md", "\u4F1A\u8BDD", "Sessions"],
    ["session-query.md", "\u4F1A\u8BDD\u67E5\u8BE2", "Session query"],
    ["session-reference.md", "\u4F1A\u8BDD\u5F15\u7528", "Session references"],
    ["session-title.md", "\u4F1A\u8BDD\u6807\u9898", "Session titles"],
    ["session-projection.md", "\u4F1A\u8BDD\u6295\u5F71", "Session projections"],
    ["persistence.md", "\u4F1A\u8BDD\u6301\u4E45\u5316", "Session persistence"],
    ["spill.md", "Spill \u5B58\u50A8", "Spill storage"],
    ["session-telemetry.md", "\u9065\u6D4B", "SessionTelemetryBackend"]
  ]],
  ["\u6A21\u578B\u4E0E\u4E0A\u4E0B\u6587", "Model and context", [
    ["llm-streaming.md", "LLM \u6D41\u5F0F\u54CD\u5E94", "LLM streaming"],
    ["token-meter.md", "Token \u8BA1\u91CF", "Token metering"],
    ["system-prompt.md", "\u7CFB\u7EDF\u63D0\u793A\u8BCD", "System prompts"],
    ["compaction.md", "\u4E0A\u4E0B\u6587\u538B\u7F29", "Compaction"]
  ]],
  ["\u6267\u884C\u4E0E\u5DE5\u5177", "Execution and tools", [
    ["tools.md", "\u5DE5\u5177", "Tools"],
    ["shell.md", "Bash \u6267\u884C", "Bash execution"],
    ["subprocess.md", "\u5B50\u8FDB\u7A0B", "Subprocesses"],
    ["terminal.md", "PTY \u4F1A\u8BDD", "PTY sessions"],
    ["jobs.md", "\u540E\u53F0\u4EFB\u52A1", "Background jobs"],
    ["filesystem.md", "\u6587\u4EF6\u7CFB\u7EDF", "Filesystem"],
    ["lsp.md", "LSP \u5BFC\u822A", "LSP navigation"],
    ["ptc-runtime.md", "PTC \u8FD0\u884C\u65F6", "PTC runtime"],
    ["web.md", "Web \u8BBF\u95EE", "Web access"],
    ["skills.md", "\u6280\u80FD", "Skills"],
    ["workflow.md", "\u5DE5\u4F5C\u6D41", "Workflows"],
    ["subagent.md", "\u5B50\u4EE3\u7406", "Subagents"]
  ]],
  ["\u7B56\u7565\u4E0E\u4EA4\u4E92", "Policy and interaction", [
    ["approval.md", "\u5BA1\u6279", "Approvals"],
    ["permission-presets.md", "\u6743\u9650\u9884\u8BBE", "Permission presets"],
    ["sandbox.md", "\u6C99\u7BB1", "Sandboxing"],
    ["plan.md", "\u8BA1\u5212\u6A21\u5F0F", "Plan mode"],
    ["user-questions.md", "\u7528\u6237\u4EA4\u4E92", "User interaction"],
    ["commands.md", "\u547D\u4EE4", "Human commands"],
    ["goal.md", "\u76EE\u6807", "Goals"],
    ["schedule.md", "\u5B9A\u65F6\u63D0\u9192", "Scheduled reminders"]
  ]],
  ["\u5E73\u53F0\u4E0E\u63A5\u5165", "Platform and access", [
    ["web-server.md", "HTTP \u670D\u52A1\u5668", "HTTP server"],
    ["web-client.md", "Web Client \u67B6\u6784", "Web Client architecture"],
    ["client-modules.md", "\u5BA2\u6237\u7AEF\u6A21\u5757", "Client modules"],
    ["slots.md", "\u5BA2\u6237\u7AEF Slots", "Client slots"],
    ["client-resources.md", "\u5BA2\u6237\u7AEF\u8D44\u6E90", "Client resources"],
    ["sidebar-right.md", "\u53F3\u4FA7 Sidebar", "Right Sidebar"],
    ["conversation.md", "Conversation \u7EC4\u88C5", "Conversation assembly"],
    ["typert.md", "Typert", "Typert"],
    ["storage.md", "\u5B58\u50A8", "Storage"],
    ["workspace.md", "\u5DE5\u4F5C\u533A", "Workspaces"],
    ["settings.md", "\u7528\u6237\u8BBE\u7F6E", "User settings"],
    ["credentials.md", "\u7528\u6237\u51ED\u636E", "User credentials"]
  ]]
];
var subsystemsReference = subsystemGroups.flatMap(([rootSection, enSection, files]) => pairedPages(
  files.map(([file, rootLabel, enLabel], order) => ({
    source: `docs/subsystems/${file}`,
    route: file === "README.md" ? "reference/subsystems/index.md" : `reference/subsystems/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: rootSection, en: enSection },
    order,
    // Subsystem pages carry long third-level sections a two-level outline reaches.
    outline: [2, 3],
    ...file === "README.md" ? { sourceAliases: ["docs/subsystems"] } : {}
  }))
));
var reference = [
  // `docs/deepseek-llm-api-wire-extensions.md` is a repository-only provider protocol reference.
  // Projected links intentionally resolve to its GitHub source instead of a public site route.
  ...pairedPages([
    ["docs/architecture.md", "reference/index.md", "\u67B6\u6784", "Architecture", 0]
  ].map(([source, route, rootLabel, enLabel, order]) => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "\u6982\u5FF5", en: "Concepts" },
    order
  }))),
  ...pairedPages([
    ["docs/capability-seams.md", "reference/capability-seams.md", "\u80FD\u529B\u670D\u52A1", "Capability services", 2],
    ["docs/agent-lifecycle.md", "reference/agent-lifecycle.md", "Agent \u751F\u547D\u5468\u671F", "Agent lifecycle", 3],
    ["docs/tool-execution-pipeline.md", "reference/tool-execution-pipeline.md", "Tool \u6267\u884C", "Tool execution", 4],
    ["docs/api-gateway.md", "reference/api-gateway.md", "API Gateway", "API Gateway", 5]
  ].map(([source, route, rootLabel, enLabel, order]) => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "\u6982\u5FF5", en: "Concepts" },
    order
  }))),
  ...pairedPages([
    ["docs/config-catalog.md", "reference/config-catalog.md", "\u63D2\u4EF6\u914D\u7F6E", "Plugin configuration"],
    ["docs/tool-catalog.md", "reference/tool-catalog.md", "Tool Schema", "Tool schemas"],
    ["docs/persistence-catalog.md", "reference/persistence-catalog.md", "\u6301\u4E45\u5316\u4E8B\u4EF6", "Persistence events", "deep"]
  ].map(([source, route, rootLabel, enLabel, outline], order) => ({
    source,
    route,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "\u751F\u6210\u53C2\u8003", en: "Generated reference" },
    order,
    ...outline === void 0 ? {} : { outline }
  }))),
  ...pairedPages([
    ["context.md", "Context", "Context"],
    ["events.md", "Events", "Events"],
    ["fiber.md", "Fiber", "Fiber"],
    ["registry.md", "Plugin Registry", "Plugin Registry"],
    ["service.md", "Service", "Service"]
  ].map(([file, rootLabel, enLabel], order) => ({
    source: `docs/cordis-api/${file}`,
    route: `reference/cordis-api/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "Cordis API", en: "Cordis Core API" },
    order
  }))),
  ...mirroredPages([
    ["inherited.md", "\u7EE7\u627F\u63A5\u53E3\u9762", "Inherited surface"]
  ].map(([file, rootLabel, enLabel], order) => ({
    source: `docs/cordis-api/${file}`,
    route: `reference/cordis-api/${file}`,
    contentLocale: "en-US",
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "Cordis API", en: "Cordis Core API" },
    order: order + 5
  }))),
  ...pairedPages([
    ["adding-a-package.md", "\u65B0\u589E Package", "Adding a package"],
    ["adding-a-tool.md", "\u65B0\u589E Tool", "Adding a tool"],
    ["adding-an-llm-adapter.md", "\u65B0\u589E LLM Adapter", "Adding an LLM adapter"],
    ["adding-a-settings-card.md", "\u65B0\u589E\u8BBE\u7F6E\u5361\u7247", "Adding a settings card"],
    ["extension-cookbook.md", "\u6269\u5C55\u6A21\u5F0F", "Extension patterns"]
  ].map(([file, rootLabel, enLabel], order) => ({
    source: `docs/cookbook/${file}`,
    route: `reference/cookbook/${file}`,
    label: { root: rootLabel, en: enLabel },
    sidebar: { root: "zh-reference", en: "en-reference" },
    section: { root: "\u5F00\u53D1\u624B\u518C", en: "Cookbook" },
    order
  })))
];
var localeCollections = {
  root: ["zh-guide", "zh-develop", "zh-reference"],
  en: ["en-guide", "en-develop", "en-reference"]
};
var sections = {
  root: [
    { label: "\u5165\u95E8" },
    { label: "SDK" },
    { label: "\u81EA\u52A8\u5316" },
    { label: "\u96C6\u6210" },
    { label: "\u57FA\u7840" },
    { label: "\u6846\u67B6\u80FD\u529B" },
    { label: "\u5B9E\u6218" },
    { label: "Cordis \u6846\u67B6\u6559\u7A0B" },
    { label: "\u6982\u5FF5" },
    { label: "\u751F\u6210\u53C2\u8003" },
    { label: "Cordis API" },
    { label: "\u5F00\u53D1\u624B\u518C" },
    { label: "\u603B\u89C8" },
    { label: "\u5185\u6838\u4E0E\u4F5C\u7528\u57DF", collapsed: true },
    { label: "\u4F1A\u8BDD\u4E0E\u6301\u4E45\u5316", collapsed: true },
    { label: "\u6A21\u578B\u4E0E\u4E0A\u4E0B\u6587", collapsed: true },
    { label: "\u6267\u884C\u4E0E\u5DE5\u5177", collapsed: true },
    { label: "\u7B56\u7565\u4E0E\u4EA4\u4E92", collapsed: true },
    { label: "\u5E73\u53F0\u4E0E\u63A5\u5165", collapsed: true }
  ],
  en: [
    { label: "Guide" },
    { label: "SDK" },
    { label: "Automation" },
    { label: "Integrations" },
    { label: "Basics" },
    { label: "Framework" },
    { label: "Practice" },
    { label: "Cordis framework tutorial" },
    { label: "Concepts" },
    { label: "Generated reference" },
    { label: "Cordis Core API" },
    { label: "Cookbook" },
    { label: "Overview" },
    { label: "Core and scopes", collapsed: true },
    { label: "Sessions and persistence", collapsed: true },
    { label: "Model and context", collapsed: true },
    { label: "Execution and tools", collapsed: true },
    { label: "Policy and interaction", collapsed: true },
    { label: "Platform and access", collapsed: true }
  ]
};
function sectionSpec(locale, label) {
  const declared = sections[locale];
  const section = declared.find((candidate) => candidate.label === label);
  if (section === void 0) throw new Error(`Sidebar section "${label}" has no placement in the ${locale} locale.`);
  return { ...section, index: declared.indexOf(section) };
}
var docsPages = [
  ...homeAndGuide,
  ...develop,
  ...cordisTutorial,
  ...cordisPrimerReference,
  ...subsystemsReference,
  ...reference
];
function orderedPages(locale, collection) {
  return docsPages.filter((page) => page.locale === locale && page.sidebar === collection).sort((left, right) => sectionSpec(locale, left.section).index - sectionSpec(locale, right.section).index || left.order - right.order);
}
function routeLink(route) {
  return `/${route.replace(/(?:index)?\.md$/, "")}`;
}
function landingLink(locale, collection) {
  const first = orderedPages(locale, collection)[0];
  if (first === void 0) throw new Error(`Sidebar collection "${collection}" publishes no page.`);
  return routeLink(first.route);
}

// scripts/project-doc-site.ts
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, extname, posix, relative, resolve, sep } from "node:path";
import { fromMarkdown as fromMarkdown2 } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/mdast-util-from-markdown@2.0.3_supports-color@9.4.0/node_modules/mdast-util-from-markdown/index.js";
import { gfmFromMarkdown as gfmFromMarkdown2 } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/mdast-util-gfm@3.1.0/node_modules/mdast-util-gfm/index.js";
import { gfm as gfm2 } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/micromark-extension-gfm@3.0.0/node_modules/micromark-extension-gfm/index.js";

// scripts/markdown.ts
import { fromMarkdown } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/mdast-util-from-markdown@2.0.3_supports-color@9.4.0/node_modules/mdast-util-from-markdown/index.js";
import { gfmFromMarkdown } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/mdast-util-gfm@3.1.0/node_modules/mdast-util-gfm/index.js";
import { gfm } from "file:///E:/%E6%96%B0%E5%88%9B%E6%84%8F%E6%9E%84%E6%80%9D/Cluster-Cooperation/deepseek-harness/node_modules/.pnpm/micromark-extension-gfm@3.0.0/node_modules/micromark-extension-gfm/index.js";
function isExternalOrAbsoluteMarkdownUrl(url) {
  return url.startsWith("#") || url.startsWith("//") || url.startsWith("/") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}
function splitMarkdownUrlTarget(url) {
  const boundary = url.search(/[?#]/);
  if (boundary === -1) return { path: url, suffix: "" };
  return { path: url.slice(0, boundary), suffix: url.slice(boundary) };
}
function skipWhitespace(source, start) {
  let index = start;
  while (/\s/.test(source[index] ?? "")) index += 1;
  return index;
}
function labelEnd(source) {
  const first = source.indexOf("[");
  if (first === -1) return -1;
  let depth = 0;
  for (let index = first; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") index += 1;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}
function destinationRange(rawNode, type) {
  const endOfLabel = labelEnd(rawNode);
  if (endOfLabel === -1) throw new Error(`markdown: cannot locate label end in ${JSON.stringify(rawNode)}`);
  let start;
  if (type === "definition") {
    const colon = rawNode.indexOf(":", endOfLabel + 1);
    if (colon === -1) throw new Error(`markdown: cannot locate definition separator in ${JSON.stringify(rawNode)}`);
    start = skipWhitespace(rawNode, colon + 1);
  } else {
    if (rawNode[endOfLabel + 1] !== "(") {
      throw new Error(`markdown: cannot locate inline destination in ${JSON.stringify(rawNode)}`);
    }
    start = skipWhitespace(rawNode, endOfLabel + 2);
  }
  if (rawNode[start] === "<") {
    for (let index = start + 1; index < rawNode.length; index += 1) {
      if (rawNode[index] === "\\") index += 1;
      else if (rawNode[index] === ">") return { start: start + 1, end: index };
    }
    throw new Error(`markdown: cannot locate angle-bracket destination end in ${JSON.stringify(rawNode)}`);
  }
  let depth = 0;
  for (let index = start; index < rawNode.length; index += 1) {
    const char = rawNode[index];
    if (char === "\\") index += 1;
    else if (char === "(") depth += 1;
    else if (char === ")") {
      if (depth === 0) return { start, end: index };
      depth -= 1;
    } else if (/\s/.test(char ?? "") && depth === 0) {
      return { start, end: index };
    }
  }
  return { start, end: rawNode.length };
}
function markdownDestination(source, node) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === void 0 || end === void 0) {
    throw new Error(`markdown: destination ${JSON.stringify(node.url)} has no source offsets`);
  }
  const range = destinationRange(source.slice(start, end), node.type);
  const absolute = { start: start + range.start, end: start + range.end };
  return { ...absolute, url: source.slice(absolute.start, absolute.end) };
}

// scripts/project-doc-site.ts
var __vite_injected_original_dirname = "E:\\\u65B0\u521B\u610F\u6784\u601D\\Cluster-Cooperation\\deepseek-harness\\scripts";
var REPOSITORY_URL = "https://github.com/deepseek-ai/deepseek-harness";
var root = resolve(__vite_injected_original_dirname, "..");
var generatedRoot = resolve(root, "website/.generated");
function resolveRepositoryRef(environment) {
  return environment.DOCS_REPOSITORY_REF ?? "master";
}
function repoPath(absPath, repoRoot) {
  return relative(repoRoot, absPath).split(sep).join("/");
}
function decodePath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    throw new Error(`project-doc-site: malformed percent escape in ${JSON.stringify(path)}.`);
  }
}
function routeTarget(fromRoute, toRoute, suffix) {
  const target = posix.relative(posix.dirname(fromRoute), toRoute);
  return `${target.startsWith(".") ? target : `./${target}`}${suffix}`;
}
function sourceMap(pages) {
  const map = /* @__PURE__ */ new Map();
  for (const page of pages) {
    for (const source of [page.source, ...page.sourceAliases ?? []]) {
      const localized2 = map.get(source) ?? /* @__PURE__ */ new Map();
      if (localized2.has(page.locale)) {
        throw new Error(`project-doc-site: duplicate source or alias ${JSON.stringify(source)} for locale ${JSON.stringify(page.locale)}.`);
      }
      localized2.set(page.locale, page);
      map.set(source, localized2);
    }
  }
  return map;
}
function counterpartSource(source) {
  return source.endsWith(".zh.md") ? source.replace(/\.zh\.md$/, ".md") : source.replace(/\.md$/, ".zh.md");
}
function resolveRepositoryTarget(sourceAbs, rawPath, repoRoot) {
  const decoded = decodePath(rawPath);
  let absPath = resolve(dirname(sourceAbs), decoded);
  if (existsSync(absPath)) return { absPath };
  const lineMatch = decoded.match(/:(\d+)$/);
  if (lineMatch !== null) {
    const lineText = lineMatch[1];
    if (lineText === void 0) throw new Error("project-doc-site: line suffix matched without a line number.");
    absPath = resolve(dirname(sourceAbs), decoded.slice(0, -lineMatch[0].length));
    if (existsSync(absPath)) return { absPath, line: Number.parseInt(lineText, 10) };
  }
  if (extname(decoded) === "") {
    const markdown = resolve(dirname(sourceAbs), `${decoded}.md`);
    if (existsSync(markdown)) return { absPath: markdown };
    const index = resolve(dirname(sourceAbs), decoded, "index.md");
    if (existsSync(index)) return { absPath: index };
  }
  throw new Error(`project-doc-site: ${repoPath(sourceAbs, repoRoot)} links to missing path ${JSON.stringify(rawPath)}.`);
}
function githubTarget(absPath, line, suffix, repositoryRef, repoRoot, image) {
  const path = repoPath(absPath, repoRoot);
  if (image) return `https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/${repositoryRef}/${path}${suffix}`;
  const kind = lstatSync(absPath).isDirectory() ? "tree" : "blob";
  const lineSuffix = line === void 0 ? suffix : `#L${line}`;
  return `${REPOSITORY_URL}/${kind}/${repositoryRef}/${path}${lineSuffix}`;
}
function rewriteMarkdown(source, options) {
  const sourceAbs = resolve(options.repoRoot, options.sourcePath);
  const published = sourceMap(options.pages);
  const tree = fromMarkdown2(source, { extensions: [gfm2()], mdastExtensions: [gfmFromMarkdown2()] });
  const replacements = [];
  const rewrite = (node) => {
    if (isExternalOrAbsoluteMarkdownUrl(node.url)) return;
    const { path, suffix } = splitMarkdownUrlTarget(node.url);
    if (path === "") return;
    const { absPath, line } = resolveRepositoryTarget(sourceAbs, path, options.repoRoot);
    const targetPath = repoPath(absPath, options.repoRoot);
    const isLanguageSwitcher = targetPath === counterpartSource(options.sourcePath);
    const targetLocale = isLanguageSwitcher ? options.locale === "root" ? "en" : "root" : options.locale;
    const page = published.get(targetPath)?.get(targetLocale);
    const nextUrl = page !== void 0 ? routeTarget(options.route, page.route, suffix) : node.type === "image" && options.placeImage !== void 0 ? `${options.placeImage(absPath)}${suffix}` : githubTarget(absPath, line, suffix, options.repositoryRef, options.repoRoot, node.type === "image");
    const destination = markdownDestination(source, node);
    replacements.push({
      start: destination.start,
      end: destination.end,
      value: nextUrl
    });
  };
  const visit = (node) => {
    if ((node.type === "link" || node.type === "image" || node.type === "definition") && "url" in node) rewrite(node);
    if ("children" in node) {
      for (const child of node.children) visit(child);
    }
  };
  visit(tree);
  let projected = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    projected = projected.slice(0, replacement.start) + replacement.value + projected.slice(replacement.end);
  }
  return projected;
}
function addProjectionFrontmatter(markdown, page) {
  const fields = [
    `editSource: ${JSON.stringify(page.source)}`,
    ...page.sidebar === null ? [] : [`rawMarkdownPath: ${JSON.stringify(page.route)}`],
    ...page.outline === void 0 ? [] : [`outline: ${JSON.stringify(page.outline)}`]
  ].join("\n");
  if (markdown.startsWith("---\n")) return markdown.replace("---\n", `---
${fields}
`);
  return `---
${fields}
---

${markdown}`;
}
var LANGUAGE_SWITCHER = /^(?:English \| \[中文\]\([^)]*\)|\[English\]\([^)]*\) \| 中文)$/;
var REPOSITORY_BADGE = /^\[!\[[^\]]*\]\(https:\/\/img\.shields\.io\/[^)]*\)\]\([^)]*\)$/;
function withoutRepositoryChrome(markdown) {
  const lines = markdown.split("\n");
  const switcher = lines.findIndex((line) => LANGUAGE_SWITCHER.test(line));
  if (switcher !== -1 && switcher < 8) {
    lines.splice(switcher, lines[switcher + 1] === "" ? 2 : 1);
  }
  const badge = lines.findLastIndex((line) => REPOSITORY_BADGE.test(line));
  if (badge !== -1) {
    lines.splice(lines[badge - 1] === "" ? badge - 1 : badge, lines[badge - 1] === "" ? 2 : 1);
  }
  return lines.join("\n");
}
function projectedPageContent(markdown, page) {
  if (page.sidebar !== null) return withoutRepositoryChrome(markdown);
  if (!markdown.startsWith("---\n")) {
    throw new Error(`project-doc-site: locale home source ${JSON.stringify(page.source)} must start with YAML frontmatter.`);
  }
  const closingDelimiter = "\n---\n";
  const closing = markdown.indexOf(closingDelimiter, 4);
  if (closing === -1) {
    throw new Error(`project-doc-site: locale home source ${JSON.stringify(page.source)} has unclosed YAML frontmatter.`);
  }
  return markdown.slice(0, closing + closingDelimiter.length);
}
function publishableImage(absPath, repoRoot) {
  const real = realpathSync(absPath);
  const inside = real === repoRoot || real.startsWith(`${repoRoot}${sep}`);
  return inside && statSync(real).isFile() ? real : void 0;
}
function referencedImages() {
  const found = /* @__PURE__ */ new Set();
  for (const page of docsPages) {
    const sourceAbs = resolve(root, page.source);
    if (!existsSync(sourceAbs)) continue;
    rewriteMarkdown(readFileSync(sourceAbs, "utf8"), {
      sourcePath: page.source,
      locale: page.locale,
      route: page.route,
      pages: docsPages,
      repoRoot: root,
      repositoryRef: "master",
      placeImage: (absPath) => {
        const real = publishableImage(absPath, root);
        if (real !== void 0) found.add(real);
        return "";
      }
    });
  }
  return [...found];
}
function docsSourceFiles() {
  return [.../* @__PURE__ */ new Set([...docsPages.map((page) => resolve(root, page.source)), ...referencedImages()])];
}
function defaultProjectionContext() {
  return { pages: docsPages, repoRoot: root, repositoryRef: resolveRepositoryRef(process.env) };
}
function projectPagesInto(targetRoot, context, pageContent, entries = context.pages) {
  const routes = /* @__PURE__ */ new Set();
  const claimed = /* @__PURE__ */ new Map();
  const claim = (target, sourceAbs) => {
    const holder = claimed.get(target);
    if (holder !== void 0 && holder !== sourceAbs) {
      throw new Error(
        `project-doc-site: ${repoPath(sourceAbs, context.repoRoot)} and ${repoPath(holder, context.repoRoot)} both project to ${relative(targetRoot, target).split(sep).join("/")}.`
      );
    }
    if (holder === void 0 && existsSync(target)) {
      throw new Error(
        `project-doc-site: ${repoPath(sourceAbs, context.repoRoot)} would overwrite existing build file ${relative(targetRoot, target).split(sep).join("/")}.`
      );
    }
    claimed.set(target, sourceAbs);
  };
  for (const page of entries) {
    if (routes.has(page.route)) throw new Error(`project-doc-site: duplicate route ${JSON.stringify(page.route)}.`);
    routes.add(page.route);
    const sourceAbs = resolve(context.repoRoot, page.source);
    if (!existsSync(sourceAbs) || !lstatSync(sourceAbs).isFile()) {
      throw new Error(`project-doc-site: source ${JSON.stringify(page.source)} does not exist or is not a file.`);
    }
    const output = resolve(targetRoot, page.route);
    claim(output, sourceAbs);
    mkdirSync(dirname(output), { recursive: true });
    const markdown = readFileSync(sourceAbs, "utf8");
    const projected = rewriteMarkdown(markdown, {
      sourcePath: page.source,
      locale: page.locale,
      route: page.route,
      pages: context.pages,
      repoRoot: context.repoRoot,
      repositoryRef: context.repositoryRef,
      placeImage: (absPath) => {
        const real = publishableImage(absPath, context.repoRoot);
        if (real === void 0) {
          throw new Error(
            `project-doc-site: ${page.source} references image ${repoPath(absPath, context.repoRoot)}, which is not a regular file inside the repository.`
          );
        }
        const name = basename(real);
        const target = resolve(dirname(output), name);
        claim(target, real);
        copyFileSync(real, target);
        return `./${encodeURI(name)}`;
      }
    });
    writeFileSync(output, pageContent(projected, page));
  }
}
function projectDocs() {
  rmSync(generatedRoot, { recursive: true, force: true });
  projectPagesInto(generatedRoot, defaultProjectionContext(), (markdown, page) => addProjectionFrontmatter(projectedPageContent(markdown, page), page));
}
function withoutFrontmatter(markdown, source) {
  if (!markdown.startsWith("---\n")) return markdown;
  const closingDelimiter = "\n---\n";
  const closing = markdown.indexOf(closingDelimiter, 4);
  if (closing === -1) {
    throw new Error(`project-doc-site: ${JSON.stringify(source)} has unclosed YAML frontmatter.`);
  }
  return markdown.slice(closing + closingDelimiter.length).replace(/^\n+/, "");
}
function rawMarkdownPageContent(markdown, source) {
  return withoutRepositoryChrome(withoutFrontmatter(markdown, source));
}
function indexAliasRoute(route) {
  const match = /^(.+)\/index\.md$/.exec(route);
  return match?.[1] === void 0 ? void 0 : `${match[1]}.md`;
}
function emitRawMarkdownPages(outDir, context = defaultProjectionContext()) {
  const aliases = context.pages.flatMap((page) => {
    const alias = indexAliasRoute(page.route);
    return alias === void 0 ? [] : [{ ...page, route: alias }];
  });
  projectPagesInto(
    outDir,
    context,
    (markdown, page) => `\uFEFF${rawMarkdownPageContent(markdown, page.source)}`,
    [...context.pages, ...aliases]
  );
}
function rawMarkdownRoute(route, context = defaultProjectionContext()) {
  const page = context.pages.find((candidate) => candidate.route === route);
  if (page === void 0) return void 0;
  const markdown = readFileSync(resolve(context.repoRoot, page.source), "utf8");
  return rawMarkdownPageContent(rewriteMarkdown(markdown, {
    sourcePath: page.source,
    locale: page.locale,
    route: page.route,
    pages: context.pages,
    repoRoot: context.repoRoot,
    repositoryRef: context.repositoryRef,
    placeImage: (absPath) => `./${encodeURI(basename(absPath))}`
  }), page.source);
}
var llmsTxtLocales = [
  { heading: "\u7B80\u4F53\u4E2D\u6587", locale: "root" },
  { heading: "English", locale: "en" }
];
function llmsTxt(site) {
  const lines = [
    `# ${site.title}`,
    "",
    `> ${site.description}`,
    "",
    "\u9875\u9762 URL \u53BB\u6389\u672B\u5C3E\u659C\u6760\u518D\u52A0 `.md` \u5373\u4E3A\u8BE5\u9875\u539F\u59CB Markdown(\u6839\u8DEF\u5F84\u7528 `/index.md`);\u4E0B\u65B9\u5217\u8868\u662F\u5404\u9875\u7CBE\u786E\u5730\u5740\u3002Drop any trailing slash and append `.md` to a page URL for its raw Markdown (the site root is `/index.md`); the list below carries the exact addresses."
  ];
  for (const { heading, locale } of llmsTxtLocales) {
    lines.push("", `## ${heading}`, "");
    for (const collection of localeCollections[locale]) {
      for (const page of orderedPages(locale, collection)) {
        lines.push(`- [${page.label}](${site.base}${page.route}): ${page.section}`);
      }
    }
  }
  return `${lines.join("\n")}
`;
}

// website/raw-markdown.ts
function rawMarkdownMiddleware(base2, index) {
  return (req, res, next) => {
    if (req.url === void 0 || req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    let url;
    try {
      url = new URL(req.url, "http://docs.local");
    } catch (_error) {
      next();
      return;
    }
    if (!url.pathname.startsWith(base2)) {
      next();
      return;
    }
    const path = url.pathname.slice(base2.length);
    const explicit = path.endsWith(".md") && url.searchParams.get("dsh-raw") === "1";
    const destination = req.headers["sec-fetch-dest"];
    if (destination !== void 0 && destination !== "document" && !(destination === "empty" && explicit)) {
      next();
      return;
    }
    const content = path === "llms.txt" ? index() : path.endsWith(".md") ? rawMarkdownRoute(path) : void 0;
    if (content === void 0) {
      if (!explicit) {
        next();
        return;
      }
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", `${path === "llms.txt" ? "text/plain" : "text/markdown"}; charset=utf-8`);
    res.end(req.method === "HEAD" ? void 0 : content);
  };
}

// website/.vitepress/config.ts
var __vite_injected_original_dirname2 = "E:\\\u65B0\u521B\u610F\u6784\u601D\\Cluster-Cooperation\\deepseek-harness\\website\\.vitepress";
projectDocs();
function sidebar(locale, collection) {
  const groups = /* @__PURE__ */ new Map();
  for (const page of orderedPages(locale, collection)) {
    const entries = groups.get(page.section) ?? [];
    entries.push(page);
    groups.set(page.section, entries);
  }
  return [...groups.entries()].map(([text, entries]) => {
    const { collapsed } = sectionSpec(locale, text);
    return {
      text,
      // A present `collapsed` is what makes the default theme render the
      // group as collapsible at all, so an open group must omit the key.
      ...collapsed === void 0 ? {} : { collapsed },
      items: entries.map((page) => ({ text: page.label, link: routeLink(page.route) }))
    };
  });
}
var guideModules = {
  root: {
    guide: localeCollections.root[0],
    develop: { label: "\u5F00\u53D1", collection: localeCollections.root[1] },
    reference: { label: "\u53C2\u8003", collection: localeCollections.root[2] }
  },
  en: {
    guide: localeCollections.en[0],
    develop: { label: "Development", collection: localeCollections.en[1] },
    reference: { label: "Reference", collection: localeCollections.en[2] }
  }
};
function guideSidebar(locale) {
  const { guide, develop: develop2, reference: reference2 } = guideModules[locale];
  return [
    ...sidebar(locale, guide),
    ...[develop2, reference2].map(({ label, collection }) => ({
      text: label,
      link: landingLink(locale, collection)
    }))
  ];
}
function moduleNav(locale) {
  const { develop: develop2, reference: reference2 } = guideModules[locale];
  const routePrefix = locale === "root" ? "" : "/en";
  return [
    { text: develop2.label, link: landingLink(locale, develop2.collection), activeMatch: `^${routePrefix}/develop/` },
    { text: reference2.label, link: landingLink(locale, reference2.collection), activeMatch: `^${routePrefix}/reference/` }
  ];
}
function watchCanonicalDocs(server) {
  const sources = docsSourceFiles();
  server.watcher.add(sources);
  server.watcher.on("change", (changed) => {
    if (!sources.includes(changed)) return;
    projectDocs();
  });
}
function serveRawMarkdown(server) {
  server.middlewares.use(rawMarkdownMiddleware(base, () => llmsTxt({ base, ...siteIdentity })));
}
function escapeVueInterpolation(html) {
  return html.replaceAll("{{", "&#123;&#123;").replaceAll("}}", "&#125;&#125;");
}
var sharedTheme = {
  search: {
    provider: "local",
    options: {
      locales: {
        root: {
          translations: {
            button: {
              buttonText: "\u641C\u7D22\u6587\u6863",
              buttonAriaLabel: "\u641C\u7D22\u6587\u6863"
            },
            modal: {
              displayDetails: "\u663E\u793A\u8BE6\u7EC6\u5217\u8868",
              resetButtonTitle: "\u6E05\u9664\u641C\u7D22",
              backButtonTitle: "\u5173\u95ED\u641C\u7D22",
              noResultsText: "\u672A\u627E\u5230\u76F8\u5173\u7ED3\u679C",
              footer: {
                selectText: "\u9009\u62E9",
                selectKeyAriaLabel: "\u56DE\u8F66\u952E",
                navigateText: "\u5207\u6362",
                navigateUpKeyAriaLabel: "\u4E0A\u65B9\u5411\u952E",
                navigateDownKeyAriaLabel: "\u4E0B\u65B9\u5411\u952E",
                closeText: "\u5173\u95ED",
                closeKeyAriaLabel: "Esc \u952E"
              }
            }
          }
        }
      }
    }
  },
  socialLinks: [
    { icon: "github", link: "https://github.com/deepseek-ai/deepseek-harness" }
  ],
  editLink: {
    pattern: ({ frontmatter }) => {
      const data = frontmatter;
      const editSource = typeof data === "object" && data !== null ? Reflect.get(data, "editSource") : void 0;
      if (typeof editSource !== "string") throw new Error("Projected documentation page has no editSource frontmatter.");
      return `https://github.com/deepseek-ai/deepseek-harness/edit/master/${editSource}`;
    },
    text: "\u5728 GitHub \u4E0A\u7F16\u8F91\u6B64\u9875"
  }
};
var base = process.env.DOCS_BASE ?? "/";
var siteIdentity = {
  title: "DeepSeek Harness",
  description: "\u7528\u4E8E\u6784\u5EFA Agent Harness \u7684\u63D2\u4EF6\u5316 SDK"
};
var wordmark = readFileSync2(resolve2(__vite_injected_original_dirname2, "../public/wordmark.svg"), "utf8").trim().replace("<svg ", '<svg class="dsh-wordmark" ');
var siteStyle = `
.dsh-lockup { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.dsh-wordmark { display: block; height: 22px; width: auto; color: var(--vp-c-text-1); }
.dsh-tag {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--vp-c-brand-soft);
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  color: var(--vp-c-brand-1);
}

.VPSidebar::-webkit-scrollbar { width: 6px; }
.VPSidebar::-webkit-scrollbar-track { background: transparent; }
.VPSidebar::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 3px;
  transition: background-color 0.3s;
}
.VPSidebar[data-scrolling]::-webkit-scrollbar-thumb { background-color: var(--vp-c-text-3); }
@supports not selector(::-webkit-scrollbar) {
  .VPSidebar { scrollbar-width: thin; scrollbar-color: transparent transparent; }
  .VPSidebar[data-scrolling] { scrollbar-color: var(--vp-c-text-3) transparent; }
}
`;
var scrollbarScript = `
(() => {
  let idle
  addEventListener('scroll', (event) => {
    const target = event.target
    if (!(target instanceof Element) || !target.classList.contains('VPSidebar')) return
    target.dataset.scrolling = ''
    clearTimeout(idle)
    idle = setTimeout(() => delete target.dataset.scrolling, 800)
  }, true)
})()
`;
function siteTitle(previewTag) {
  return `<span class="dsh-lockup">${wordmark}<span class="dsh-tag">${previewTag}</span></span>`;
}
var config_default = withMermaid({
  title: siteIdentity.title,
  description: siteIdentity.description,
  base,
  transformHead: ({ siteConfig }) => codeGroupFallbackHead(siteConfig.mpa),
  /** Emit the raw-Markdown twin of every route plus llms.txt beside the rendered site. */
  buildEnd(siteConfig) {
    emitRawMarkdownPages(siteConfig.outDir);
    writeFileSync2(resolve2(siteConfig.outDir, "llms.txt"), llmsTxt({ base, ...siteIdentity }));
  },
  head: [
    // VitePress leaves head hrefs untouched, so the base belongs here explicitly.
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["style", {}, siteStyle],
    ["script", {}, scrollbarScript]
  ],
  cleanUrls: true,
  srcDir: ".generated",
  cacheDir: ".cache",
  outDir: ".dist",
  locales: {
    root: {
      label: "\u7B80\u4F53\u4E2D\u6587",
      lang: "zh-CN",
      themeConfig: {
        siteTitle: siteTitle("\u6280\u672F\u9884\u89C8"),
        nav: [
          { text: "\u5165\u95E8", link: landingLink("root", guideModules.root.guide), activeMatch: "^/guide/" },
          ...moduleNav("root")
        ],
        sidebar: {
          "/guide/": guideSidebar("root"),
          "/develop/": sidebar("root", "zh-develop"),
          "/reference/": sidebar("root", "zh-reference")
        },
        outline: { label: "\u672C\u9875\u76EE\u5F55" },
        docFooter: { prev: "\u4E0A\u4E00\u7BC7", next: "\u4E0B\u4E00\u7BC7" },
        darkModeSwitchLabel: "\u5916\u89C2",
        lightModeSwitchTitle: "\u5207\u6362\u5230\u6D45\u8272\u4E3B\u9898",
        darkModeSwitchTitle: "\u5207\u6362\u5230\u6DF1\u8272\u4E3B\u9898",
        sidebarMenuLabel: "\u83DC\u5355",
        returnToTopLabel: "\u8FD4\u56DE\u9876\u90E8",
        langMenuLabel: "\u5207\u6362\u8BED\u8A00",
        skipToContentLabel: "\u8DF3\u81F3\u5185\u5BB9"
      }
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      themeConfig: {
        siteTitle: siteTitle("Preview"),
        nav: [
          { text: "Guide", link: landingLink("en", guideModules.en.guide), activeMatch: "^/en/guide/" },
          ...moduleNav("en")
        ],
        sidebar: {
          "/en/guide/": guideSidebar("en"),
          "/en/develop/": sidebar("en", "en-develop"),
          "/en/reference/": sidebar("en", "en-reference")
        },
        editLink: {
          pattern: ({ frontmatter }) => {
            const data = frontmatter;
            const editSource = typeof data === "object" && data !== null ? Reflect.get(data, "editSource") : void 0;
            if (typeof editSource !== "string") throw new Error("Projected documentation page has no editSource frontmatter.");
            return `https://github.com/deepseek-ai/deepseek-harness/edit/master/${editSource}`;
          },
          text: "Edit this page on GitHub"
        },
        outline: { label: "On this page" },
        docFooter: { prev: "Previous", next: "Next" }
      }
    }
  },
  vite: {
    // `srcDir` puts the Vite root inside the disposable generated tree, whose
    // own `public/` no tracked asset can live in.
    publicDir: resolve2(__vite_injected_original_dirname2, "../public"),
    plugins: [
      {
        name: "deepseek-harness-doc-projector",
        configureServer(server) {
          watchCanonicalDocs(server);
          serveRawMarkdown(server);
        }
      }
    ]
  },
  markdown: {
    config(md) {
      isolateCodeGroupRadios(md);
      const renderText = md.renderer.rules.text;
      const renderCode = md.renderer.rules.code_inline;
      const renderFence = md.renderer.rules.fence;
      if (renderText === void 0) throw new Error("VitePress Markdown renderer is missing the text rendering rule.");
      if (renderCode === void 0) throw new Error("VitePress Markdown renderer is missing the inline-code rendering rule.");
      if (renderFence === void 0) throw new Error("VitePress Markdown renderer is missing the fence rendering rule.");
      md.renderer.rules.text = (...args) => escapeVueInterpolation(renderText(...args));
      md.renderer.rules.code_inline = (...args) => escapeVueInterpolation(renderCode(...args));
      const renderedFences = /* @__PURE__ */ new Map();
      md.renderer.rules.fence = (...args) => {
        const [tokens, index] = args;
        const token = tokens[index];
        if (token === void 0) throw new Error("VitePress code-fence renderer received no token.");
        if (["mermaid", "mmd"].includes(token.info.trim().split(/\s+/, 1)[0] ?? "")) return renderFence(...args);
        if (Reflect.get(token, "src") !== void 0) return renderFence(...args);
        if (process.env.NODE_ENV !== "production") return renderFence(...args);
        const key = JSON.stringify([token.content, token.info, token.markup, token.attrs]);
        const cached = renderedFences.get(key);
        if (cached !== void 0) return cached;
        const html = renderFence(...args);
        renderedFences.set(key, html);
        return html;
      };
    }
  },
  mermaid: {},
  themeConfig: sharedTheme
});
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsid2Vic2l0ZS8udml0ZXByZXNzL2NvbmZpZy50cyIsICJ3ZWJzaXRlLy52aXRlcHJlc3MvY29kZS1ncm91cHMudHMiLCAid2Vic2l0ZS9kb2NzLnRzIiwgInNjcmlwdHMvcHJvamVjdC1kb2Mtc2l0ZS50cyIsICJzY3JpcHRzL21hcmtkb3duLnRzIiwgIndlYnNpdGUvcmF3LW1hcmtkb3duLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcXHU2NUIwXHU1MjFCXHU2MTBGXHU2Nzg0XHU2MDFEXFxcXENsdXN0ZXItQ29vcGVyYXRpb25cXFxcZGVlcHNlZWstaGFybmVzc1xcXFx3ZWJzaXRlXFxcXC52aXRlcHJlc3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFx1NjVCMFx1NTIxQlx1NjEwRlx1Njc4NFx1NjAxRFxcXFxDbHVzdGVyLUNvb3BlcmF0aW9uXFxcXGRlZXBzZWVrLWhhcm5lc3NcXFxcd2Vic2l0ZVxcXFwudml0ZXByZXNzXFxcXGNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU2JTk2JUIwJUU1JTg4JTlCJUU2JTg0JThGJUU2JTlFJTg0JUU2JTgwJTlEL0NsdXN0ZXItQ29vcGVyYXRpb24vZGVlcHNlZWstaGFybmVzcy93ZWJzaXRlLy52aXRlcHJlc3MvY29uZmlnLnRzXCI7LyoqIFZpdGVQcmVzcyBjb25maWd1cmF0aW9uIGZvciB0aGUgbG9jYWxseSBwcm9qZWN0ZWQgZG9jdW1lbnRhdGlvbiBzaXRlLiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB0eXBlIHsgRGVmYXVsdFRoZW1lLCBQYWdlRGF0YSwgU2l0ZUNvbmZpZyB9IGZyb20gJ3ZpdGVwcmVzcydcbmltcG9ydCB0eXBlIHsgVml0ZURldlNlcnZlciB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgeyB3aXRoTWVybWFpZCB9IGZyb20gJ3ZpdGVwcmVzcy1wbHVnaW4tbWVybWFpZCdcbmltcG9ydCB7IGNvZGVHcm91cEZhbGxiYWNrSGVhZCwgaXNvbGF0ZUNvZGVHcm91cFJhZGlvcyB9IGZyb20gJy4vY29kZS1ncm91cHMudHMnXG5pbXBvcnQgeyBsYW5kaW5nTGluaywgbG9jYWxlQ29sbGVjdGlvbnMsIG9yZGVyZWRQYWdlcywgcm91dGVMaW5rLCBzZWN0aW9uU3BlYywgdHlwZSBEb2NzTG9jYWxlLCB0eXBlIERvY3NQYWdlLCB0eXBlIERvY3NTaWRlYmFyIH0gZnJvbSAnLi4vZG9jcy50cydcbmltcG9ydCB7IGRvY3NTb3VyY2VGaWxlcywgZW1pdFJhd01hcmtkb3duUGFnZXMsIGxsbXNUeHQsIHByb2plY3REb2NzIH0gZnJvbSAnLi4vLi4vc2NyaXB0cy9wcm9qZWN0LWRvYy1zaXRlLnRzJ1xuaW1wb3J0IHsgcmF3TWFya2Rvd25NaWRkbGV3YXJlIH0gZnJvbSAnLi4vcmF3LW1hcmtkb3duLnRzJ1xuXG5wcm9qZWN0RG9jcygpXG5cbmZ1bmN0aW9uIHNpZGViYXIobG9jYWxlOiBEb2NzTG9jYWxlLCBjb2xsZWN0aW9uOiBOb25OdWxsYWJsZTxEb2NzUGFnZVsnc2lkZWJhciddPik6IERlZmF1bHRUaGVtZS5TaWRlYmFySXRlbVtdIHtcbiAgLy8gYG9yZGVyZWRQYWdlc2AgYWxyZWFkeSBzb3J0cyBieSBzZWN0aW9uIHBsYWNlbWVudCwgc28gaW5zZXJ0aW9uIG9yZGVyXG4gIC8vIGNhcnJpZXMgdGhlIGdyb3VwIG9yZGVyIGFuZCBlYWNoIGdyb3VwIGtlZXBzIGl0cyBwYWdlcyBpbiBzZXF1ZW5jZS5cbiAgY29uc3QgZ3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIERvY3NQYWdlW10+KClcbiAgZm9yIChjb25zdCBwYWdlIG9mIG9yZGVyZWRQYWdlcyhsb2NhbGUsIGNvbGxlY3Rpb24pKSB7XG4gICAgY29uc3QgZW50cmllcyA9IGdyb3Vwcy5nZXQocGFnZS5zZWN0aW9uKSA/PyBbXVxuICAgIGVudHJpZXMucHVzaChwYWdlKVxuICAgIGdyb3Vwcy5zZXQocGFnZS5zZWN0aW9uLCBlbnRyaWVzKVxuICB9XG4gIHJldHVybiBbLi4uZ3JvdXBzLmVudHJpZXMoKV0ubWFwKChbdGV4dCwgZW50cmllc10pID0+IHtcbiAgICBjb25zdCB7IGNvbGxhcHNlZCB9ID0gc2VjdGlvblNwZWMobG9jYWxlLCB0ZXh0KVxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgLy8gQSBwcmVzZW50IGBjb2xsYXBzZWRgIGlzIHdoYXQgbWFrZXMgdGhlIGRlZmF1bHQgdGhlbWUgcmVuZGVyIHRoZVxuICAgICAgLy8gZ3JvdXAgYXMgY29sbGFwc2libGUgYXQgYWxsLCBzbyBhbiBvcGVuIGdyb3VwIG11c3Qgb21pdCB0aGUga2V5LlxuICAgICAgLi4uKGNvbGxhcHNlZCA9PT0gdW5kZWZpbmVkID8ge30gOiB7IGNvbGxhcHNlZCB9KSxcbiAgICAgIGl0ZW1zOiBlbnRyaWVzLm1hcChwYWdlID0+ICh7IHRleHQ6IHBhZ2UubGFiZWwsIGxpbms6IHJvdXRlTGluayhwYWdlLnJvdXRlKSB9KSksXG4gICAgfVxuICB9KVxufVxuXG4vKiogT25lIG1vZHVsZSBsaW5rIHNoYXJlZCBiZXR3ZWVuIHRoZSBuYXZpZ2F0aW9uIGJhciBhbmQgdGhlIGd1aWRlIHNpZGViYXIuICovXG5pbnRlcmZhY2UgR3VpZGVNb2R1bGVMaW5rIHtcbiAgLyoqIExhYmVsIHNob3duIGluIHRoZSBuYXZpZ2F0aW9uIGJhciBhbmQgdGhlIGd1aWRlIHNpZGViYXIuICovXG4gIGxhYmVsOiBzdHJpbmdcbiAgLyoqIFNpZGViYXIgY29sbGVjdGlvbiB0aGUgbGluayBvcGVucy4gKi9cbiAgY29sbGVjdGlvbjogRG9jc1NpZGViYXJcbn1cblxuLyoqXG4gKiBQZXItbG9jYWxlIGd1aWRlLW1vZHVsZSBmYWN0czogdGhlIGd1aWRlIGNvbGxlY3Rpb24gYW5kIHRoZSBtb2R1bGUgbGlua3NcbiAqIGFwcGVuZGVkIHRvIHRoZSBndWlkZSBzaWRlYmFyLlxuICovXG5pbnRlcmZhY2UgR3VpZGVNb2R1bGVzIHtcbiAgLyoqIEd1aWRlIHNpZGViYXIgY29sbGVjdGlvbiBmb3IgdGhlIGxvY2FsZS4gKi9cbiAgZ3VpZGU6ICd6aC1ndWlkZScgfCAnZW4tZ3VpZGUnXG4gIC8qKiBEZXZlbG9wbWVudCBtb2R1bGUgbGluay4gKi9cbiAgZGV2ZWxvcDogR3VpZGVNb2R1bGVMaW5rXG4gIC8qKiBSZWZlcmVuY2UgbW9kdWxlIGxpbmsuICovXG4gIHJlZmVyZW5jZTogR3VpZGVNb2R1bGVMaW5rXG59XG5cbi8qKlxuICogR3VpZGUtbW9kdWxlIGZhY3RzIGtleWVkIGJ5IGxvY2FsZSwgZ2l2aW5nIGV2ZXJ5IG1vZHVsZSBsYWJlbCBhbmQgY29sbGVjdGlvblxuICogb25lIGhvbWUgc2hhcmVkIGJ5IHRoZSBuYXZpZ2F0aW9uIGJhciBhbmQgdGhlIGd1aWRlIHNpZGViYXIuXG4gKi9cbmNvbnN0IGd1aWRlTW9kdWxlcyA9IHtcbiAgcm9vdDoge1xuICAgIGd1aWRlOiBsb2NhbGVDb2xsZWN0aW9ucy5yb290WzBdLFxuICAgIGRldmVsb3A6IHsgbGFiZWw6ICdcdTVGMDBcdTUzRDEnLCBjb2xsZWN0aW9uOiBsb2NhbGVDb2xsZWN0aW9ucy5yb290WzFdIH0sXG4gICAgcmVmZXJlbmNlOiB7IGxhYmVsOiAnXHU1M0MyXHU4MDAzJywgY29sbGVjdGlvbjogbG9jYWxlQ29sbGVjdGlvbnMucm9vdFsyXSB9LFxuICB9LFxuICBlbjoge1xuICAgIGd1aWRlOiBsb2NhbGVDb2xsZWN0aW9ucy5lblswXSxcbiAgICBkZXZlbG9wOiB7IGxhYmVsOiAnRGV2ZWxvcG1lbnQnLCBjb2xsZWN0aW9uOiBsb2NhbGVDb2xsZWN0aW9ucy5lblsxXSB9LFxuICAgIHJlZmVyZW5jZTogeyBsYWJlbDogJ1JlZmVyZW5jZScsIGNvbGxlY3Rpb246IGxvY2FsZUNvbGxlY3Rpb25zLmVuWzJdIH0sXG4gIH0sXG59IHNhdGlzZmllcyBSZWNvcmQ8RG9jc0xvY2FsZSwgR3VpZGVNb2R1bGVzPlxuXG4vKipcbiAqIEd1aWRlIHNpZGViYXIgd2l0aCBkaXJlY3QgbGlua3MgaW50byB0aGUgZmlyc3QgZGV2ZWxvcG1lbnQgYW5kIHJlZmVyZW5jZSBwYWdlcy5cbiAqXG4gKiBAcGFyYW0gbG9jYWxlIC0gUm91dGUgdHJlZSB3aG9zZSBndWlkZSBzaWRlYmFyIGlzIGJlaW5nIGJ1aWx0LlxuICogQHJldHVybnMgR3VpZGUgZ3JvdXBzIGZvbGxvd2VkIGJ5IHRvcC1sZXZlbCBsaW5rcyB0byB0aGUgb3RoZXIgZG9jdW1lbnRhdGlvbiBtb2R1bGVzLlxuICovXG5mdW5jdGlvbiBndWlkZVNpZGViYXIobG9jYWxlOiBEb2NzTG9jYWxlKTogRGVmYXVsdFRoZW1lLlNpZGViYXJJdGVtW10ge1xuICBjb25zdCB7IGd1aWRlLCBkZXZlbG9wLCByZWZlcmVuY2UgfSA9IGd1aWRlTW9kdWxlc1tsb2NhbGVdXG4gIHJldHVybiBbXG4gICAgLi4uc2lkZWJhcihsb2NhbGUsIGd1aWRlKSxcbiAgICAuLi5bZGV2ZWxvcCwgcmVmZXJlbmNlXS5tYXAoKHsgbGFiZWwsIGNvbGxlY3Rpb24gfSkgPT4gKHtcbiAgICAgIHRleHQ6IGxhYmVsLFxuICAgICAgbGluazogbGFuZGluZ0xpbmsobG9jYWxlLCBjb2xsZWN0aW9uKSxcbiAgICB9KSksXG4gIF1cbn1cblxuLyoqXG4gKiBOYXZpZ2F0aW9uLWJhciBpdGVtcyBmb3IgdGhlIG1vZHVsZXMgdGhlIGd1aWRlIHNpZGViYXIgbGlua3MgaW50bywgcmVhZGluZ1xuICogdGhlaXIgbGFiZWxzIGFuZCBjb2xsZWN0aW9ucyBmcm9tIHRoZSBzaGFyZWQgcGVyLWxvY2FsZSByZWNvcmQuXG4gKlxuICogQHBhcmFtIGxvY2FsZSAtIFJvdXRlIHRyZWUgdGhlIG5hdmlnYXRpb24gaXRlbXMgYmVsb25nIHRvLlxuICogQHJldHVybnMgVGhlIG1vZHVsZSBpdGVtcyBmb3IgdGhlIGxvY2FsZSdzIG5hdmlnYXRpb24gYmFyLlxuICovXG5mdW5jdGlvbiBtb2R1bGVOYXYobG9jYWxlOiBEb2NzTG9jYWxlKTogRGVmYXVsdFRoZW1lLk5hdkl0ZW1bXSB7XG4gIGNvbnN0IHsgZGV2ZWxvcCwgcmVmZXJlbmNlIH0gPSBndWlkZU1vZHVsZXNbbG9jYWxlXVxuICBjb25zdCByb3V0ZVByZWZpeCA9IGxvY2FsZSA9PT0gJ3Jvb3QnID8gJycgOiAnL2VuJ1xuICByZXR1cm4gW1xuICAgIHsgdGV4dDogZGV2ZWxvcC5sYWJlbCwgbGluazogbGFuZGluZ0xpbmsobG9jYWxlLCBkZXZlbG9wLmNvbGxlY3Rpb24pLCBhY3RpdmVNYXRjaDogYF4ke3JvdXRlUHJlZml4fS9kZXZlbG9wL2AgfSxcbiAgICB7IHRleHQ6IHJlZmVyZW5jZS5sYWJlbCwgbGluazogbGFuZGluZ0xpbmsobG9jYWxlLCByZWZlcmVuY2UuY29sbGVjdGlvbiksIGFjdGl2ZU1hdGNoOiBgXiR7cm91dGVQcmVmaXh9L3JlZmVyZW5jZS9gIH0sXG4gIF1cbn1cblxuZnVuY3Rpb24gd2F0Y2hDYW5vbmljYWxEb2NzKHNlcnZlcjogVml0ZURldlNlcnZlcik6IHZvaWQge1xuICBjb25zdCBzb3VyY2VzID0gZG9jc1NvdXJjZUZpbGVzKClcbiAgc2VydmVyLndhdGNoZXIuYWRkKHNvdXJjZXMpXG4gIHNlcnZlci53YXRjaGVyLm9uKCdjaGFuZ2UnLCAoY2hhbmdlZCkgPT4ge1xuICAgIGlmICghc291cmNlcy5pbmNsdWRlcyhjaGFuZ2VkKSkgcmV0dXJuXG4gICAgcHJvamVjdERvY3MoKVxuICB9KVxufVxuXG4vKipcbiAqIFNlcnZlIHRoZSByYXctTWFya2Rvd24gdHdpbiBvZiBlYWNoIHJvdXRlIGFuZCBsbG1zLnR4dCBkdXJpbmcgZGV2ZWxvcG1lbnQsXG4gKiBtYXRjaGluZyB3aGF0IGBidWlsZEVuZGAgZW1pdHMgaW50byB0aGUgc3RhdGljIGJ1aWxkLiBQYWdlcyBwcm9qZWN0IGZyb21cbiAqIHRoZWlyIGNhbm9uaWNhbCBzb3VyY2VzIHBlciByZXF1ZXN0LCBzbyBhbiBlZGl0IHNob3dzIHdpdGhvdXQgYSByZWJ1aWxkLlxuICovXG5mdW5jdGlvbiBzZXJ2ZVJhd01hcmtkb3duKHNlcnZlcjogVml0ZURldlNlcnZlcik6IHZvaWQge1xuICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKHJhd01hcmtkb3duTWlkZGxld2FyZShiYXNlLCAoKSA9PiBsbG1zVHh0KHsgYmFzZSwgLi4uc2l0ZUlkZW50aXR5IH0pKSlcbn1cblxuZnVuY3Rpb24gZXNjYXBlVnVlSW50ZXJwb2xhdGlvbihodG1sOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlQWxsKCd7eycsICcmIzEyMzsmIzEyMzsnKS5yZXBsYWNlQWxsKCd9fScsICcmIzEyNTsmIzEyNTsnKVxufVxuXG5jb25zdCBzaGFyZWRUaGVtZTogUGljazxEZWZhdWx0VGhlbWUuQ29uZmlnLCAnc2VhcmNoJyB8ICdzb2NpYWxMaW5rcycgfCAnZWRpdExpbmsnPiA9IHtcbiAgc2VhcmNoOiB7XG4gICAgcHJvdmlkZXI6ICdsb2NhbCcsXG4gICAgb3B0aW9uczoge1xuICAgICAgbG9jYWxlczoge1xuICAgICAgICByb290OiB7XG4gICAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBidXR0b246IHtcbiAgICAgICAgICAgICAgYnV0dG9uVGV4dDogJ1x1NjQxQ1x1N0QyMlx1NjU4N1x1Njg2MycsXG4gICAgICAgICAgICAgIGJ1dHRvbkFyaWFMYWJlbDogJ1x1NjQxQ1x1N0QyMlx1NjU4N1x1Njg2MycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbW9kYWw6IHtcbiAgICAgICAgICAgICAgZGlzcGxheURldGFpbHM6ICdcdTY2M0VcdTc5M0FcdThCRTZcdTdFQzZcdTUyMTdcdTg4NjgnLFxuICAgICAgICAgICAgICByZXNldEJ1dHRvblRpdGxlOiAnXHU2RTA1XHU5NjY0XHU2NDFDXHU3RDIyJyxcbiAgICAgICAgICAgICAgYmFja0J1dHRvblRpdGxlOiAnXHU1MTczXHU5NUVEXHU2NDFDXHU3RDIyJyxcbiAgICAgICAgICAgICAgbm9SZXN1bHRzVGV4dDogJ1x1NjcyQVx1NjI3RVx1NTIzMFx1NzZGOFx1NTE3M1x1N0VEM1x1Njc5QycsXG4gICAgICAgICAgICAgIGZvb3Rlcjoge1xuICAgICAgICAgICAgICAgIHNlbGVjdFRleHQ6ICdcdTkwMDlcdTYyRTknLFxuICAgICAgICAgICAgICAgIHNlbGVjdEtleUFyaWFMYWJlbDogJ1x1NTZERVx1OEY2Nlx1OTUyRScsXG4gICAgICAgICAgICAgICAgbmF2aWdhdGVUZXh0OiAnXHU1MjA3XHU2MzYyJyxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0ZVVwS2V5QXJpYUxhYmVsOiAnXHU0RTBBXHU2NUI5XHU1NDExXHU5NTJFJyxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0ZURvd25LZXlBcmlhTGFiZWw6ICdcdTRFMEJcdTY1QjlcdTU0MTFcdTk1MkUnLFxuICAgICAgICAgICAgICAgIGNsb3NlVGV4dDogJ1x1NTE3M1x1OTVFRCcsXG4gICAgICAgICAgICAgICAgY2xvc2VLZXlBcmlhTGFiZWw6ICdFc2MgXHU5NTJFJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc29jaWFsTGlua3M6IFtcbiAgICB7IGljb246ICdnaXRodWInLCBsaW5rOiAnaHR0cHM6Ly9naXRodWIuY29tL2RlZXBzZWVrLWFpL2RlZXBzZWVrLWhhcm5lc3MnIH0sXG4gIF0sXG4gIGVkaXRMaW5rOiB7XG4gICAgcGF0dGVybjogKHsgZnJvbnRtYXR0ZXIgfTogUGFnZURhdGEpID0+IHtcbiAgICAgIGNvbnN0IGRhdGE6IHVua25vd24gPSBmcm9udG1hdHRlclxuICAgICAgY29uc3QgZWRpdFNvdXJjZTogdW5rbm93biA9IHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhICE9PSBudWxsID8gUmVmbGVjdC5nZXQoZGF0YSwgJ2VkaXRTb3VyY2UnKSA6IHVuZGVmaW5lZFxuICAgICAgaWYgKHR5cGVvZiBlZGl0U291cmNlICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdQcm9qZWN0ZWQgZG9jdW1lbnRhdGlvbiBwYWdlIGhhcyBubyBlZGl0U291cmNlIGZyb250bWF0dGVyLicpXG4gICAgICByZXR1cm4gYGh0dHBzOi8vZ2l0aHViLmNvbS9kZWVwc2Vlay1haS9kZWVwc2Vlay1oYXJuZXNzL2VkaXQvbWFzdGVyLyR7ZWRpdFNvdXJjZX1gXG4gICAgfSxcbiAgICB0ZXh0OiAnXHU1NzI4IEdpdEh1YiBcdTRFMEFcdTdGMTZcdThGOTFcdTZCNjRcdTk4NzUnLFxuICB9LFxufVxuXG4vKiogU2l0ZSBiYXNlIHBhdGgsIGNhcnJ5aW5nIHRoZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIFZpdGVQcmVzcyByZXF1aXJlcy4gKi9cbmNvbnN0IGJhc2UgPSBwcm9jZXNzLmVudi5ET0NTX0JBU0UgPz8gJy8nXG5cbi8qKiBTaXRlIGlkZW50aXR5IHNoYXJlZCBieSB0aGUgVml0ZVByZXNzIGNvbmZpZ3VyYXRpb24gYW5kIHRoZSBsbG1zLnR4dCBpbmRleC4gKi9cbmNvbnN0IHNpdGVJZGVudGl0eSA9IHtcbiAgdGl0bGU6ICdEZWVwU2VlayBIYXJuZXNzJyxcbiAgZGVzY3JpcHRpb246ICdcdTc1MjhcdTRFOEVcdTY3ODRcdTVFRkEgQWdlbnQgSGFybmVzcyBcdTc2ODRcdTYzRDJcdTRFRjZcdTUzMTYgU0RLJyxcbn1cblxuLyoqXG4gKiBUaGUgRGVlcFNlZWsgd29yZG1hcmssIGlubGluZWQgc28gaXRzIGBjdXJyZW50Q29sb3JgIGZpbGxzIGZvbGxvdyB0aGUgYWN0aXZlXG4gKiB0aGVtZS4gQW4gYDxpbWc+YCB3b3VsZCBmcmVlemUgdGhlIG1hcmsgYXQgdGhlIGNvbG9ycyB0aGUgZmlsZSBkZWNsYXJlcy5cbiAqL1xuY29uc3Qgd29yZG1hcmsgPSByZWFkRmlsZVN5bmMocmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCAnLi4vcHVibGljL3dvcmRtYXJrLnN2ZycpLCAndXRmOCcpXG4gIC50cmltKClcbiAgLnJlcGxhY2UoJzxzdmcgJywgJzxzdmcgY2xhc3M9XCJkc2gtd29yZG1hcmtcIiAnKVxuXG4vKipcbiAqIEhlYWQtaW5qZWN0ZWQgc3R5bGVzIGZvciB0aGUgc2l0ZSBpZGVudGl0eSBhbmQgc2lkZWJhciBzY3JvbGxiYXIuXG4gKlxuICogVGhlIG5hdmlnYXRpb24tYmFyIGxvY2t1cCBwYWlycyB3aXRoIGBzaXRlVGl0bGVgLiBUaGUgc2Nyb2xsYmFyIHJ1bGVzIHJlcGxhY2VcbiAqIHRoZSBzaWRlYmFyJ3MgcGxhdGZvcm0gYmFyLCB3aGljaCByZXNlcnZlcyAxNXB4IG9mIGEgMjY1cHggY29sdW1uIGFuZCBkcmF3cyBhXG4gKiB0cmFjayB0aGUgcmVzdCBvZiB0aGUgbmF2aWdhdGlvbiBoYXMgbm8gYm9yZGVyIGZvcjsgYHNjcm9sbGJhclNjcmlwdGAgc3VwcGxpZXNcbiAqIHRoZSBtYXJrZXIgdGhhdCByZXZlYWxzIHRoZSB0aHVtYi4gQ2hyb21lIGRyb3BzIGA6Oi13ZWJraXQtc2Nyb2xsYmFyYCBvbmNlXG4gKiBgc2Nyb2xsYmFyLXdpZHRoYCBpcyBzZXQgdG8gYW55dGhpbmcgYnV0IGBhdXRvYCwgc28gdGhlIHN0YW5kYXJkIHByb3BlcnRpZXNcbiAqIHN0YXkgYmVoaW5kIGEgcXVlcnkgb25seSBGaXJlZm94IGFuc3dlcnMuXG4gKi9cbmNvbnN0IHNpdGVTdHlsZSA9IGBcbi5kc2gtbG9ja3VwIHsgZGlzcGxheTogaW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyBtaW4td2lkdGg6IDA7IH1cbi5kc2gtd29yZG1hcmsgeyBkaXNwbGF5OiBibG9jazsgaGVpZ2h0OiAyMnB4OyB3aWR0aDogYXV0bzsgY29sb3I6IHZhcigtLXZwLWMtdGV4dC0xKTsgfVxuLmRzaC10YWcge1xuICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tdnAtYy1icmFuZC1zb2Z0KTtcbiAgYm9yZGVyLXJhZGl1czogOTk5cHg7XG4gIHBhZGRpbmc6IDFweCA5cHg7XG4gIGZvbnQtc2l6ZTogMTJweDtcbiAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgbGluZS1oZWlnaHQ6IDE4cHg7XG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gIGNvbG9yOiB2YXIoLS12cC1jLWJyYW5kLTEpO1xufVxuXG4uVlBTaWRlYmFyOjotd2Via2l0LXNjcm9sbGJhciB7IHdpZHRoOiA2cHg7IH1cbi5WUFNpZGViYXI6Oi13ZWJraXQtc2Nyb2xsYmFyLXRyYWNrIHsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IH1cbi5WUFNpZGViYXI6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHtcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjNzO1xufVxuLlZQU2lkZWJhcltkYXRhLXNjcm9sbGluZ106Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHsgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnAtYy10ZXh0LTMpOyB9XG5Ac3VwcG9ydHMgbm90IHNlbGVjdG9yKDo6LXdlYmtpdC1zY3JvbGxiYXIpIHtcbiAgLlZQU2lkZWJhciB7IHNjcm9sbGJhci13aWR0aDogdGhpbjsgc2Nyb2xsYmFyLWNvbG9yOiB0cmFuc3BhcmVudCB0cmFuc3BhcmVudDsgfVxuICAuVlBTaWRlYmFyW2RhdGEtc2Nyb2xsaW5nXSB7IHNjcm9sbGJhci1jb2xvcjogdmFyKC0tdnAtYy10ZXh0LTMpIHRyYW5zcGFyZW50OyB9XG59XG5gXG5cbi8qKlxuICogTWFyayB0aGUgc2lkZWJhciB3aGlsZSBpdCBzY3JvbGxzLCBzbyBpdHMgc2Nyb2xsYmFyIHJlc3RzIGludmlzaWJsZS5cbiAqXG4gKiBBIHNpemVkIGA6Oi13ZWJraXQtc2Nyb2xsYmFyYCBvcHRzIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgcGxhdGZvcm0nc1xuICogc2VsZi1oaWRpbmcgb3ZlcmxheSBiYXIsIGxlYXZpbmcgb25lIHBhaW50ZWQgYXQgYWxsIHRpbWVzOyBub3RoaW5nIGluIENTU1xuICogcmVwb3J0cyB0aGF0IGFuIGVsZW1lbnQgaXMgc2Nyb2xsaW5nLiBUaGUgbGlzdGVuZXIgY2FwdHVyZXMgaW5zdGVhZCBvZlxuICogYnViYmxpbmcgYmVjYXVzZSBzY3JvbGwgZXZlbnRzIGRvIG5vdCBidWJibGUsIGFuZCBtYXJrcyBhIGBkYXRhLWAgYXR0cmlidXRlXG4gKiByYXRoZXIgdGhhbiBhIGNsYXNzIGJlY2F1c2UgVnVlIHJld3JpdGVzIGBjbGFzc2Agd2hvbGVzYWxlIHdoZW4gaXQgcGF0Y2hlc1xuICogdGhlIGVsZW1lbnQuXG4gKi9cbmNvbnN0IHNjcm9sbGJhclNjcmlwdCA9IGBcbigoKSA9PiB7XG4gIGxldCBpZGxlXG4gIGFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIChldmVudCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldFxuICAgIGlmICghKHRhcmdldCBpbnN0YW5jZW9mIEVsZW1lbnQpIHx8ICF0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdWUFNpZGViYXInKSkgcmV0dXJuXG4gICAgdGFyZ2V0LmRhdGFzZXQuc2Nyb2xsaW5nID0gJydcbiAgICBjbGVhclRpbWVvdXQoaWRsZSlcbiAgICBpZGxlID0gc2V0VGltZW91dCgoKSA9PiBkZWxldGUgdGFyZ2V0LmRhdGFzZXQuc2Nyb2xsaW5nLCA4MDApXG4gIH0sIHRydWUpXG59KSgpXG5gXG5cbi8qKlxuICogTmF2aWdhdGlvbi1iYXIgdGl0bGU6IHRoZSBEZWVwU2VlayB3b3JkbWFyayBhbmQgdGhlIHJlbGVhc2Utc3RhZ2UgdGFnLlxuICogVml0ZVByZXNzIHJlbmRlcnMgYHNpdGVUaXRsZWAgYXMgSFRNTC5cbiAqXG4gKiBAcGFyYW0gcHJldmlld1RhZyAtIExvY2FsaXplZCByZWxlYXNlLXN0YWdlIGxhYmVsLlxuICogQHJldHVybnMgTWFya3VwIHBsYWNlZCBiZXNpZGUgdGhlIG5hdmlnYXRpb24tYmFyIGhvbWUgbGluay5cbiAqL1xuZnVuY3Rpb24gc2l0ZVRpdGxlKHByZXZpZXdUYWc6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgPHNwYW4gY2xhc3M9XCJkc2gtbG9ja3VwXCI+JHt3b3JkbWFya308c3BhbiBjbGFzcz1cImRzaC10YWdcIj4ke3ByZXZpZXdUYWd9PC9zcGFuPjwvc3Bhbj5gXG59XG5cbmV4cG9ydCBkZWZhdWx0IHdpdGhNZXJtYWlkKHtcbiAgdGl0bGU6IHNpdGVJZGVudGl0eS50aXRsZSxcbiAgZGVzY3JpcHRpb246IHNpdGVJZGVudGl0eS5kZXNjcmlwdGlvbixcbiAgYmFzZSxcbiAgdHJhbnNmb3JtSGVhZDogKHsgc2l0ZUNvbmZpZyB9KSA9PiBjb2RlR3JvdXBGYWxsYmFja0hlYWQoc2l0ZUNvbmZpZy5tcGEpLFxuICAvKiogRW1pdCB0aGUgcmF3LU1hcmtkb3duIHR3aW4gb2YgZXZlcnkgcm91dGUgcGx1cyBsbG1zLnR4dCBiZXNpZGUgdGhlIHJlbmRlcmVkIHNpdGUuICovXG4gIGJ1aWxkRW5kKHNpdGVDb25maWc6IFNpdGVDb25maWcpIHtcbiAgICBlbWl0UmF3TWFya2Rvd25QYWdlcyhzaXRlQ29uZmlnLm91dERpcilcbiAgICB3cml0ZUZpbGVTeW5jKHJlc29sdmUoc2l0ZUNvbmZpZy5vdXREaXIsICdsbG1zLnR4dCcpLCBsbG1zVHh0KHsgYmFzZSwgLi4uc2l0ZUlkZW50aXR5IH0pKVxuICB9LFxuICBoZWFkOiBbXG4gICAgLy8gVml0ZVByZXNzIGxlYXZlcyBoZWFkIGhyZWZzIHVudG91Y2hlZCwgc28gdGhlIGJhc2UgYmVsb25ncyBoZXJlIGV4cGxpY2l0bHkuXG4gICAgWydsaW5rJywgeyByZWw6ICdpY29uJywgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLCBocmVmOiBgJHtiYXNlfWZhdmljb24uc3ZnYCB9XSxcbiAgICBbJ3N0eWxlJywge30sIHNpdGVTdHlsZV0sXG4gICAgWydzY3JpcHQnLCB7fSwgc2Nyb2xsYmFyU2NyaXB0XSxcbiAgXSxcbiAgY2xlYW5VcmxzOiB0cnVlLFxuICBzcmNEaXI6ICcuZ2VuZXJhdGVkJyxcbiAgY2FjaGVEaXI6ICcuY2FjaGUnLFxuICBvdXREaXI6ICcuZGlzdCcsXG4gIGxvY2FsZXM6IHtcbiAgICByb290OiB7XG4gICAgICBsYWJlbDogJ1x1N0I4MFx1NEY1M1x1NEUyRFx1NjU4NycsXG4gICAgICBsYW5nOiAnemgtQ04nLFxuICAgICAgdGhlbWVDb25maWc6IHtcbiAgICAgICAgc2l0ZVRpdGxlOiBzaXRlVGl0bGUoJ1x1NjI4MFx1NjcyRlx1OTg4NFx1ODlDOCcpLFxuICAgICAgICBuYXY6IFtcbiAgICAgICAgICB7IHRleHQ6ICdcdTUxNjVcdTk1RTgnLCBsaW5rOiBsYW5kaW5nTGluaygncm9vdCcsIGd1aWRlTW9kdWxlcy5yb290Lmd1aWRlKSwgYWN0aXZlTWF0Y2g6ICdeL2d1aWRlLycgfSxcbiAgICAgICAgICAuLi5tb2R1bGVOYXYoJ3Jvb3QnKSxcbiAgICAgICAgXSxcbiAgICAgICAgc2lkZWJhcjoge1xuICAgICAgICAgICcvZ3VpZGUvJzogZ3VpZGVTaWRlYmFyKCdyb290JyksXG4gICAgICAgICAgJy9kZXZlbG9wLyc6IHNpZGViYXIoJ3Jvb3QnLCAnemgtZGV2ZWxvcCcpLFxuICAgICAgICAgICcvcmVmZXJlbmNlLyc6IHNpZGViYXIoJ3Jvb3QnLCAnemgtcmVmZXJlbmNlJyksXG4gICAgICAgIH0sXG4gICAgICAgIG91dGxpbmU6IHsgbGFiZWw6ICdcdTY3MkNcdTk4NzVcdTc2RUVcdTVGNTUnIH0sXG4gICAgICAgIGRvY0Zvb3RlcjogeyBwcmV2OiAnXHU0RTBBXHU0RTAwXHU3QkM3JywgbmV4dDogJ1x1NEUwQlx1NEUwMFx1N0JDNycgfSxcbiAgICAgICAgZGFya01vZGVTd2l0Y2hMYWJlbDogJ1x1NTkxNlx1ODlDMicsXG4gICAgICAgIGxpZ2h0TW9kZVN3aXRjaFRpdGxlOiAnXHU1MjA3XHU2MzYyXHU1MjMwXHU2RDQ1XHU4MjcyXHU0RTNCXHU5ODk4JyxcbiAgICAgICAgZGFya01vZGVTd2l0Y2hUaXRsZTogJ1x1NTIwN1x1NjM2Mlx1NTIzMFx1NkRGMVx1ODI3Mlx1NEUzQlx1OTg5OCcsXG4gICAgICAgIHNpZGViYXJNZW51TGFiZWw6ICdcdTgzRENcdTUzNTUnLFxuICAgICAgICByZXR1cm5Ub1RvcExhYmVsOiAnXHU4RkQ0XHU1NkRFXHU5ODc2XHU5MEU4JyxcbiAgICAgICAgbGFuZ01lbnVMYWJlbDogJ1x1NTIwN1x1NjM2Mlx1OEJFRFx1OEEwMCcsXG4gICAgICAgIHNraXBUb0NvbnRlbnRMYWJlbDogJ1x1OERGM1x1ODFGM1x1NTE4NVx1NUJCOScsXG4gICAgICB9LFxuICAgIH0sXG4gICAgZW46IHtcbiAgICAgIGxhYmVsOiAnRW5nbGlzaCcsXG4gICAgICBsYW5nOiAnZW4tVVMnLFxuICAgICAgbGluazogJy9lbi8nLFxuICAgICAgdGhlbWVDb25maWc6IHtcbiAgICAgICAgc2l0ZVRpdGxlOiBzaXRlVGl0bGUoJ1ByZXZpZXcnKSxcbiAgICAgICAgbmF2OiBbXG4gICAgICAgICAgeyB0ZXh0OiAnR3VpZGUnLCBsaW5rOiBsYW5kaW5nTGluaygnZW4nLCBndWlkZU1vZHVsZXMuZW4uZ3VpZGUpLCBhY3RpdmVNYXRjaDogJ14vZW4vZ3VpZGUvJyB9LFxuICAgICAgICAgIC4uLm1vZHVsZU5hdignZW4nKSxcbiAgICAgICAgXSxcbiAgICAgICAgc2lkZWJhcjoge1xuICAgICAgICAgICcvZW4vZ3VpZGUvJzogZ3VpZGVTaWRlYmFyKCdlbicpLFxuICAgICAgICAgICcvZW4vZGV2ZWxvcC8nOiBzaWRlYmFyKCdlbicsICdlbi1kZXZlbG9wJyksXG4gICAgICAgICAgJy9lbi9yZWZlcmVuY2UvJzogc2lkZWJhcignZW4nLCAnZW4tcmVmZXJlbmNlJyksXG4gICAgICAgIH0sXG4gICAgICAgIGVkaXRMaW5rOiB7XG4gICAgICAgICAgcGF0dGVybjogKHsgZnJvbnRtYXR0ZXIgfTogUGFnZURhdGEpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGE6IHVua25vd24gPSBmcm9udG1hdHRlclxuICAgICAgICAgICAgY29uc3QgZWRpdFNvdXJjZTogdW5rbm93biA9IHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhICE9PSBudWxsID8gUmVmbGVjdC5nZXQoZGF0YSwgJ2VkaXRTb3VyY2UnKSA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBlZGl0U291cmNlICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdQcm9qZWN0ZWQgZG9jdW1lbnRhdGlvbiBwYWdlIGhhcyBubyBlZGl0U291cmNlIGZyb250bWF0dGVyLicpXG4gICAgICAgICAgICByZXR1cm4gYGh0dHBzOi8vZ2l0aHViLmNvbS9kZWVwc2Vlay1haS9kZWVwc2Vlay1oYXJuZXNzL2VkaXQvbWFzdGVyLyR7ZWRpdFNvdXJjZX1gXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0ZXh0OiAnRWRpdCB0aGlzIHBhZ2Ugb24gR2l0SHViJyxcbiAgICAgICAgfSxcbiAgICAgICAgb3V0bGluZTogeyBsYWJlbDogJ09uIHRoaXMgcGFnZScgfSxcbiAgICAgICAgZG9jRm9vdGVyOiB7IHByZXY6ICdQcmV2aW91cycsIG5leHQ6ICdOZXh0JyB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICB2aXRlOiB7XG4gICAgLy8gYHNyY0RpcmAgcHV0cyB0aGUgVml0ZSByb290IGluc2lkZSB0aGUgZGlzcG9zYWJsZSBnZW5lcmF0ZWQgdHJlZSwgd2hvc2VcbiAgICAvLyBvd24gYHB1YmxpYy9gIG5vIHRyYWNrZWQgYXNzZXQgY2FuIGxpdmUgaW4uXG4gICAgcHVibGljRGlyOiByZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsICcuLi9wdWJsaWMnKSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdkZWVwc2Vlay1oYXJuZXNzLWRvYy1wcm9qZWN0b3InLFxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgICAgd2F0Y2hDYW5vbmljYWxEb2NzKHNlcnZlcilcbiAgICAgICAgICBzZXJ2ZVJhd01hcmtkb3duKHNlcnZlcilcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbiAgbWFya2Rvd246IHtcbiAgICBjb25maWcobWQpIHtcbiAgICAgIGlzb2xhdGVDb2RlR3JvdXBSYWRpb3MobWQpXG4gICAgICBjb25zdCByZW5kZXJUZXh0ID0gbWQucmVuZGVyZXIucnVsZXMudGV4dFxuICAgICAgY29uc3QgcmVuZGVyQ29kZSA9IG1kLnJlbmRlcmVyLnJ1bGVzLmNvZGVfaW5saW5lXG4gICAgICBjb25zdCByZW5kZXJGZW5jZSA9IG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlXG4gICAgICBpZiAocmVuZGVyVGV4dCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1ZpdGVQcmVzcyBNYXJrZG93biByZW5kZXJlciBpcyBtaXNzaW5nIHRoZSB0ZXh0IHJlbmRlcmluZyBydWxlLicpXG4gICAgICBpZiAocmVuZGVyQ29kZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1ZpdGVQcmVzcyBNYXJrZG93biByZW5kZXJlciBpcyBtaXNzaW5nIHRoZSBpbmxpbmUtY29kZSByZW5kZXJpbmcgcnVsZS4nKVxuICAgICAgaWYgKHJlbmRlckZlbmNlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignVml0ZVByZXNzIE1hcmtkb3duIHJlbmRlcmVyIGlzIG1pc3NpbmcgdGhlIGZlbmNlIHJlbmRlcmluZyBydWxlLicpXG4gICAgICBtZC5yZW5kZXJlci5ydWxlcy50ZXh0ID0gKC4uLmFyZ3MpID0+IGVzY2FwZVZ1ZUludGVycG9sYXRpb24ocmVuZGVyVGV4dCguLi5hcmdzKSlcbiAgICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmNvZGVfaW5saW5lID0gKC4uLmFyZ3MpID0+IGVzY2FwZVZ1ZUludGVycG9sYXRpb24ocmVuZGVyQ29kZSguLi5hcmdzKSlcbiAgICAgIGNvbnN0IHJlbmRlcmVkRmVuY2VzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuICAgICAgbWQucmVuZGVyZXIucnVsZXMuZmVuY2UgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBjb25zdCBbdG9rZW5zLCBpbmRleF0gPSBhcmdzXG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4XVxuICAgICAgICBpZiAodG9rZW4gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdWaXRlUHJlc3MgY29kZS1mZW5jZSByZW5kZXJlciByZWNlaXZlZCBubyB0b2tlbi4nKVxuICAgICAgICAvLyBNZXJtYWlkIG91dHB1dCBlbWJlZHMgdGhlIHRva2VuIHBvc2l0aW9uLCBhbmQgVml0ZVByZXNzIHNuaXBwZXRzIHJlc29sdmUgc291cmNlIGZpbGVzIGR1cmluZyByZW5kZXJpbmcuXG4gICAgICAgIGlmIChbJ21lcm1haWQnLCAnbW1kJ10uaW5jbHVkZXModG9rZW4uaW5mby50cmltKCkuc3BsaXQoL1xccysvLCAxKVswXSA/PyAnJykpIHJldHVybiByZW5kZXJGZW5jZSguLi5hcmdzKVxuICAgICAgICBpZiAoUmVmbGVjdC5nZXQodG9rZW4sICdzcmMnKSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmVuZGVyRmVuY2UoLi4uYXJncylcbiAgICAgICAgLy8gS2VlcCB0aGUgY2FjaGUgYnVpbGQtbG9jYWw7IGEgZGV2IHJlbmRlcmVyIGNhbiBzdXJ2aXZlIG1hbnkgSE1SIHVwZGF0ZXMuXG4gICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSByZXR1cm4gcmVuZGVyRmVuY2UoLi4uYXJncylcbiAgICAgICAgY29uc3Qga2V5ID0gSlNPTi5zdHJpbmdpZnkoW3Rva2VuLmNvbnRlbnQsIHRva2VuLmluZm8sIHRva2VuLm1hcmt1cCwgdG9rZW4uYXR0cnNdKVxuICAgICAgICBjb25zdCBjYWNoZWQgPSByZW5kZXJlZEZlbmNlcy5nZXQoa2V5KVxuICAgICAgICBpZiAoY2FjaGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBjYWNoZWRcbiAgICAgICAgY29uc3QgaHRtbCA9IHJlbmRlckZlbmNlKC4uLmFyZ3MpXG4gICAgICAgIHJlbmRlcmVkRmVuY2VzLnNldChrZXksIGh0bWwpXG4gICAgICAgIHJldHVybiBodG1sXG4gICAgICB9XG4gICAgfSxcbiAgfSxcbiAgbWVybWFpZDoge30sXG4gIHRoZW1lQ29uZmlnOiBzaGFyZWRUaGVtZSxcbn0pXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXFx1NjVCMFx1NTIxQlx1NjEwRlx1Njc4NFx1NjAxRFxcXFxDbHVzdGVyLUNvb3BlcmF0aW9uXFxcXGRlZXBzZWVrLWhhcm5lc3NcXFxcd2Vic2l0ZVxcXFwudml0ZXByZXNzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxcdTY1QjBcdTUyMUJcdTYxMEZcdTY3ODRcdTYwMURcXFxcQ2x1c3Rlci1Db29wZXJhdGlvblxcXFxkZWVwc2Vlay1oYXJuZXNzXFxcXHdlYnNpdGVcXFxcLnZpdGVwcmVzc1xcXFxjb2RlLWdyb3Vwcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU2JTk2JUIwJUU1JTg4JTlCJUU2JTg0JThGJUU2JTlFJTg0JUU2JTgwJTlEL0NsdXN0ZXItQ29vcGVyYXRpb24vZGVlcHNlZWstaGFybmVzcy93ZWJzaXRlLy52aXRlcHJlc3MvY29kZS1ncm91cHMudHNcIjsvKiogSXNvbGF0ZXMgbmF0aXZlIGNvZGUtZ3JvdXAgcmFkaW9zIGZyb20gY29waWVzIHJlbmRlcmVkIGluIGxvY2FsIHNlYXJjaC4gKi9cblxuaW1wb3J0IHR5cGUgeyBIZWFkQ29uZmlnLCBNYXJrZG93blJlbmRlcmVyIH0gZnJvbSAndml0ZXByZXNzJ1xuXG4vKipcbiAqIEtlZXBzIGFsbCBjb2RlLWdyb3VwIGNvbW1hbmRzIHJlYWRhYmxlIHdoZW4gTVBBIG91dHB1dCBvbWl0cyB0aGUgdGhlbWUncyBjbGllbnQgaGFuZGxlcnMuXG4gKiBAcGFyYW0gbXBhIC0gV2hldGhlciB0aGUgcmVzb2x2ZWQgc2l0ZSB1c2VzIFZpdGVQcmVzcydzIE1QQSBidWlsZC5cbiAqIEByZXR1cm5zIE1QQS1vbmx5IHN0eWxlcyB0aGF0IGV4cG9zZSBldmVyeSBibG9jayBhbmQgaGlkZSBpbmFjdGl2ZSBjb250cm9scy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvZGVHcm91cEZhbGxiYWNrSGVhZChtcGE6IGJvb2xlYW4gfCB1bmRlZmluZWQpOiBIZWFkQ29uZmlnW10ge1xuICByZXR1cm4gbXBhID8gW1snc3R5bGUnLCB7fSwgYFxuLnZwLWNvZGUtZ3JvdXAgLnRhYnMsIC52cC1jb2RlLWdyb3VwIGJ1dHRvbi5jb3B5IHsgZGlzcGxheTogbm9uZTsgfVxuLnZwLWNvZGUtZ3JvdXAgLmJsb2NrcyA+IGRpdiB7IGRpc3BsYXk6IGJsb2NrOyB9XG5gXV0gOiBbXVxufVxuXG4vKipcbiAqIEdpdmVzIGVhY2ggbmF0aXZlIHRhYiBzdHJpcCBpdHMgb3duIGZvcm0gc28gc2VhcmNoIGV4Y2VycHRzIGNhbm5vdCBjbGVhciB0aGUgcGFnZSdzIHNlbGVjdGlvbi5cbiAqXG4gKiBAcGFyYW0gbWQgLSBWaXRlUHJlc3MgcmVuZGVyZXIgd2l0aCB0aGUgbmF0aXZlIGNvZGUtZ3JvdXAgcnVsZXMgaW5zdGFsbGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNvbGF0ZUNvZGVHcm91cFJhZGlvcyhtZDogTWFya2Rvd25SZW5kZXJlcik6IHZvaWQge1xuICBjb25zdCByZW5kZXIgPSBtZC5yZW5kZXJlci5ydWxlc1snY29udGFpbmVyX2NvZGUtZ3JvdXBfb3BlbiddXG4gIGlmIChyZW5kZXIgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdWaXRlUHJlc3MgTWFya2Rvd24gcmVuZGVyZXIgaXMgbWlzc2luZyB0aGUgY29kZS1ncm91cCBvcGVuaW5nIHJ1bGUuJylcbiAgbWQucmVuZGVyZXIucnVsZXNbJ2NvbnRhaW5lcl9jb2RlLWdyb3VwX29wZW4nXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgY29uc3QgaHRtbCA9IHJlbmRlciguLi5hcmdzKVxuICAgIGNvbnN0IG9wZW5pbmcgPSAnPGRpdiBjbGFzcz1cInRhYnNcIj4nXG4gICAgY29uc3QgY2xvc2luZyA9ICc8L2Rpdj48ZGl2IGNsYXNzPVwiYmxvY2tzXCI+J1xuICAgIGlmICghaHRtbC5pbmNsdWRlcyhvcGVuaW5nKSB8fCAhaHRtbC5pbmNsdWRlcyhjbG9zaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaXRlUHJlc3MgY29kZS1ncm91cCBtYXJrdXAgZG9lcyBub3QgY29udGFpbiB0aGUgZXhwZWN0ZWQgdGFiIHN0cmlwLicpXG4gICAgfVxuICAgIHJldHVybiBodG1sLnJlcGxhY2Uob3BlbmluZywgJzxmb3JtIGNsYXNzPVwidGFic1wiIEBzdWJtaXQucHJldmVudD4nKS5yZXBsYWNlKGNsb3NpbmcsICc8L2Zvcm0+PGRpdiBjbGFzcz1cImJsb2Nrc1wiPicpXG4gIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcXHU2NUIwXHU1MjFCXHU2MTBGXHU2Nzg0XHU2MDFEXFxcXENsdXN0ZXItQ29vcGVyYXRpb25cXFxcZGVlcHNlZWstaGFybmVzc1xcXFx3ZWJzaXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxcdTY1QjBcdTUyMUJcdTYxMEZcdTY3ODRcdTYwMURcXFxcQ2x1c3Rlci1Db29wZXJhdGlvblxcXFxkZWVwc2Vlay1oYXJuZXNzXFxcXHdlYnNpdGVcXFxcZG9jcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU2JTk2JUIwJUU1JTg4JTlCJUU2JTg0JThGJUU2JTlFJTg0JUU2JTgwJTlEL0NsdXN0ZXItQ29vcGVyYXRpb24vZGVlcHNlZWstaGFybmVzcy93ZWJzaXRlL2RvY3MudHNcIjsvKipcbiAqIENhbm9uaWNhbCBwdWJsaWNhdGlvbiBtYW5pZmVzdCBmb3IgdGhlIGRvY3VtZW50YXRpb24gd2Vic2l0ZS5cbiAqXG4gKiBNYXJrZG93biBzdGF5cyBpbiBpdHMgb3duaW5nIHJlcG9zaXRvcnkgdGllci4gVGhpcyBtYW5pZmVzdCBtYXBzIGVhY2hcbiAqIGNhbm9uaWNhbCBzb3VyY2UgaW50byBtYXRjaGluZyByb3V0ZSB0cmVlcyBmb3IgYm90aCBzaXRlIGxvY2FsZXM7IHdoZW4gYVxuICogdHJhbnNsYXRpb24gaXMgYWJzZW50LCBib3RoIHJvdXRlcyBpbnRlbnRpb25hbGx5IHByb2plY3QgdGhlIGF2YWlsYWJsZVxuICogc291cmNlIGluc3RlYWQgb2YgY29weWluZyBNYXJrZG93bi5cbiAqL1xuXG4vKiogTG9jYWxlIGtleSB1c2VkIGJ5IHRoZSBWaXRlUHJlc3Mgc2l0ZS4gKi9cbmV4cG9ydCB0eXBlIERvY3NMb2NhbGUgPSAncm9vdCcgfCAnZW4nXG5cbi8qKiBTaWRlYmFyIGNvbGxlY3Rpb24gcmVuZGVyZWQgZm9yIG9uZSBsb2NhbGUgYW5kIHRvcC1sZXZlbCBtb2R1bGUuICovXG5leHBvcnQgdHlwZSBEb2NzU2lkZWJhciA9XG4gIHwgJ3poLWd1aWRlJ1xuICB8ICd6aC1kZXZlbG9wJ1xuICB8ICd6aC1yZWZlcmVuY2UnXG4gIHwgJ2VuLWd1aWRlJ1xuICB8ICdlbi1kZXZlbG9wJ1xuICB8ICdlbi1yZWZlcmVuY2UnXG5cbi8qKiBBIHBhZ2UgcHJvamVjdGVkIGludG8gdGhlIFZpdGVQcmVzcyBzb3VyY2UgdHJlZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9jc1BhZ2Uge1xuICAvKiogVml0ZVByZXNzIGxvY2FsZSB3aG9zZSByb3V0ZSB0cmVlIG93bnMgdGhpcyBwcm9qZWN0aW9uLiAqL1xuICBsb2NhbGU6IERvY3NMb2NhbGVcbiAgLyoqIExhbmd1YWdlIG9mIHRoZSBjYW5vbmljYWwgc291cmNlIGN1cnJlbnRseSBwcm9qZWN0ZWQgYXQgdGhpcyByb3V0ZS4gKi9cbiAgY29udGVudExvY2FsZTogJ3poLUNOJyB8ICdlbi1VUydcbiAgLyoqIFJlcG9zaXRvcnktcmVsYXRpdmUgY2Fub25pY2FsIE1hcmtkb3duIHNvdXJjZS4gKi9cbiAgc291cmNlOiBzdHJpbmdcbiAgLyoqIFZpdGVQcmVzcyByb3V0ZSwgaW5jbHVkaW5nIHRoZSBgLm1kYCBzdWZmaXguICovXG4gIHJvdXRlOiBzdHJpbmdcbiAgLyoqIE5hdmlnYXRpb24gbGFiZWwgc2hvd24gaW4gdGhlIHNpZGViYXIuICovXG4gIGxhYmVsOiBzdHJpbmdcbiAgLyoqIFNpZGViYXIgY29sbGVjdGlvbiB0aGF0IG93bnMgdGhlIHBhZ2UsIG9yIG51bGwgZm9yIGEgbG9jYWxlIGhvbWUgcGFnZS4gKi9cbiAgc2lkZWJhcjogRG9jc1NpZGViYXIgfCBudWxsXG4gIC8qKiBTZWN0aW9uIGxhYmVsIHdpdGhpbiB0aGUgc2lkZWJhci4gKi9cbiAgc2VjdGlvbjogc3RyaW5nXG4gIC8qKiBTdGFibGUgb3JkZXIgd2l0aGluIHRoZSBzZWN0aW9uLiAqL1xuICBvcmRlcjogbnVtYmVyXG4gIC8qKiBIZWFkaW5nIGxldmVscyBpbmNsdWRlZCBpbiB0aGlzIHBhZ2UncyBWaXRlUHJlc3Mgb3V0bGluZS4gKi9cbiAgb3V0bGluZT86IG51bWJlciB8IHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl0gfCAnZGVlcCcgfCBmYWxzZVxuICAvKiogQWRkaXRpb25hbCByZXBvc2l0b3J5IHBhdGhzIHRoYXQgcmVzb2x2ZSB0byB0aGlzIHBhZ2UuICovXG4gIHNvdXJjZUFsaWFzZXM/OiBzdHJpbmdbXVxufVxuXG5pbnRlcmZhY2UgTWlycm9yZWRQYWdlIHtcbiAgc291cmNlOiBzdHJpbmcgfCBSZWNvcmQ8RG9jc0xvY2FsZSwgc3RyaW5nPlxuICByb3V0ZTogc3RyaW5nXG4gIGNvbnRlbnRMb2NhbGU6IERvY3NQYWdlWydjb250ZW50TG9jYWxlJ10gfCBSZWNvcmQ8RG9jc0xvY2FsZSwgRG9jc1BhZ2VbJ2NvbnRlbnRMb2NhbGUnXT5cbiAgbGFiZWw6IFJlY29yZDxEb2NzTG9jYWxlLCBzdHJpbmc+XG4gIHNpZGViYXI6IFJlY29yZDxEb2NzTG9jYWxlLCBEb2NzU2lkZWJhciB8IG51bGw+XG4gIHNlY3Rpb246IFJlY29yZDxEb2NzTG9jYWxlLCBzdHJpbmc+XG4gIG9yZGVyOiBudW1iZXJcbiAgb3V0bGluZT86IERvY3NQYWdlWydvdXRsaW5lJ11cbiAgc291cmNlQWxpYXNlcz86IHN0cmluZ1tdIHwgUGFydGlhbDxSZWNvcmQ8RG9jc0xvY2FsZSwgc3RyaW5nW10+PlxufVxuXG50eXBlIFBhaXJlZFBhZ2UgPSBPbWl0PE1pcnJvcmVkUGFnZSwgJ3NvdXJjZScgfCAnY29udGVudExvY2FsZScgfCAnc291cmNlQWxpYXNlcyc+ICYge1xuICAvKiogRW5nbGlzaCBzaWRlIG9mIGEgc2libGluZyBgZm9vLm1kYCAvIGBmb28uemgubWRgIHBhaXIuICovXG4gIHNvdXJjZTogc3RyaW5nXG4gIC8qKiBMYW5ndWFnZS1uZXV0cmFsIHJlcG9zaXRvcnkgYWxpYXNlcywgc3VjaCBhcyB0aGUgZGlyZWN0b3J5IG9mIGFuIGluZGV4IHBhZ2UuICovXG4gIHNvdXJjZUFsaWFzZXM/OiBzdHJpbmdbXVxufVxuXG5mdW5jdGlvbiBsb2NhbGl6ZWQ8VD4odmFsdWU6IFQgfCBSZWNvcmQ8RG9jc0xvY2FsZSwgVD4sIGxvY2FsZTogRG9jc0xvY2FsZSk6IFQge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSlcbiAgICA/ICh2YWx1ZSBhcyBSZWNvcmQ8RG9jc0xvY2FsZSwgVD4pW2xvY2FsZV1cbiAgICA6IHZhbHVlXG59XG5cbmZ1bmN0aW9uIG1pcnJvcmVkUGFnZXMocGFnZXM6IE1pcnJvcmVkUGFnZVtdKTogRG9jc1BhZ2VbXSB7XG4gIHJldHVybiBwYWdlcy5mbGF0TWFwKHBhZ2UgPT4gKFsncm9vdCcsICdlbiddIGFzIGNvbnN0KS5tYXAoKGxvY2FsZSkgPT4ge1xuICAgIGNvbnN0IGFsaWFzZXMgPSBwYWdlLnNvdXJjZUFsaWFzZXMgPT09IHVuZGVmaW5lZFxuICAgICAgPyB1bmRlZmluZWRcbiAgICAgIDogQXJyYXkuaXNBcnJheShwYWdlLnNvdXJjZUFsaWFzZXMpID8gcGFnZS5zb3VyY2VBbGlhc2VzIDogcGFnZS5zb3VyY2VBbGlhc2VzW2xvY2FsZV1cbiAgICByZXR1cm4ge1xuICAgICAgbG9jYWxlLFxuICAgICAgY29udGVudExvY2FsZTogbG9jYWxpemVkKHBhZ2UuY29udGVudExvY2FsZSwgbG9jYWxlKSxcbiAgICAgIHNvdXJjZTogbG9jYWxpemVkKHBhZ2Uuc291cmNlLCBsb2NhbGUpLFxuICAgICAgcm91dGU6IGxvY2FsZSA9PT0gJ3Jvb3QnID8gcGFnZS5yb3V0ZSA6IGBlbi8ke3BhZ2Uucm91dGV9YCxcbiAgICAgIGxhYmVsOiBwYWdlLmxhYmVsW2xvY2FsZV0sXG4gICAgICBzaWRlYmFyOiBwYWdlLnNpZGViYXJbbG9jYWxlXSxcbiAgICAgIHNlY3Rpb246IHBhZ2Uuc2VjdGlvbltsb2NhbGVdLFxuICAgICAgb3JkZXI6IHBhZ2Uub3JkZXIsXG4gICAgICAuLi4ocGFnZS5vdXRsaW5lID09PSB1bmRlZmluZWQgPyB7fSA6IHsgb3V0bGluZTogcGFnZS5vdXRsaW5lIH0pLFxuICAgICAgLi4uKGFsaWFzZXMgPT09IHVuZGVmaW5lZCA/IHt9IDogeyBzb3VyY2VBbGlhc2VzOiBhbGlhc2VzIH0pLFxuICAgIH1cbiAgfSkpXG59XG5cbmZ1bmN0aW9uIHBhaXJlZFBhZ2VzKHBhZ2VzOiBQYWlyZWRQYWdlW10pOiBEb2NzUGFnZVtdIHtcbiAgcmV0dXJuIG1pcnJvcmVkUGFnZXMocGFnZXMubWFwKChwYWdlKSA9PiB7XG4gICAgY29uc3QgY2hpbmVzZVNvdXJjZSA9IHBhZ2Uuc291cmNlLnJlcGxhY2UoL1xcLm1kJC8sICcuemgubWQnKVxuICAgIGNvbnN0IHNoYXJlZEFsaWFzZXMgPSBwYWdlLnNvdXJjZUFsaWFzZXMgPz8gW11cbiAgICByZXR1cm4ge1xuICAgICAgLi4ucGFnZSxcbiAgICAgIHNvdXJjZTogeyByb290OiBjaGluZXNlU291cmNlLCBlbjogcGFnZS5zb3VyY2UgfSxcbiAgICAgIGNvbnRlbnRMb2NhbGU6IHsgcm9vdDogJ3poLUNOJywgZW46ICdlbi1VUycgfSxcbiAgICAgIHNvdXJjZUFsaWFzZXM6IHtcbiAgICAgICAgcm9vdDogWy4uLnNoYXJlZEFsaWFzZXMsIHBhZ2Uuc291cmNlXSxcbiAgICAgICAgZW46IFsuLi5zaGFyZWRBbGlhc2VzLCBjaGluZXNlU291cmNlXSxcbiAgICAgIH0sXG4gICAgfVxuICB9KSlcbn1cblxuY29uc3QgaG9tZUFuZEd1aWRlID0gcGFpcmVkUGFnZXMoW1xuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2luZGV4Lm1kJyxcbiAgICByb3V0ZTogJ2luZGV4Lm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnRGVlcFNlZWsgSGFybmVzcycsIGVuOiAnRGVlcFNlZWsgSGFybmVzcycgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6IG51bGwsIGVuOiBudWxsIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU5OTk2XHU5ODc1JywgZW46ICdIb21lJyB9LFxuICAgIG9yZGVyOiAwLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2d1aWRlL2luZGV4Lm1kJyxcbiAgICByb3V0ZTogJ2d1aWRlL3F1aWNrc3RhcnQubWQnLFxuICAgIGxhYmVsOiB7IHJvb3Q6ICdcdTRGN0ZcdTc1MjggV2ViIFVJJywgZW46ICdVc2UgdGhlIFdlYiBVSScgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1ndWlkZScsIGVuOiAnZW4tZ3VpZGUnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU1MTY1XHU5NUU4JywgZW46ICdHdWlkZScgfSxcbiAgICBvcmRlcjogMSxcbiAgICBzb3VyY2VBbGlhc2VzOiBbJ2RvY3MvdXNlci9ndWlkZSddLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2d1aWRlL3Byb3ZpZGVycy5tZCcsXG4gICAgcm91dGU6ICdndWlkZS9wcm92aWRlcnMubWQnLFxuICAgIGxhYmVsOiB7IHJvb3Q6ICdcdTkxNERcdTdGNkVcdTZBMjFcdTU3OEInLCBlbjogJ0NvbmZpZ3VyZSBtb2RlbHMnIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtZ3VpZGUnLCBlbjogJ2VuLWd1aWRlJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1NTE2NVx1OTVFOCcsIGVuOiAnR3VpZGUnIH0sXG4gICAgb3JkZXI6IDIsXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZ3VpZGUvbmV0d29yay1wcm94eS5tZCcsXG4gICAgcm91dGU6ICdndWlkZS9uZXR3b3JrLXByb3h5Lm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU3RjUxXHU3RURDXHU0RUUzXHU3NDA2JywgZW46ICdOZXR3b3JrIHByb3h5JyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWd1aWRlJywgZW46ICdlbi1ndWlkZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTUxNjVcdTk1RTgnLCBlbjogJ0d1aWRlJyB9LFxuICAgIG9yZGVyOiAzLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2d1aWRlL3B5dGhvbi1zZGsubWQnLFxuICAgIHJvdXRlOiAnZ3VpZGUvcHl0aG9uLXNkay5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ1B5dGhvbicsIGVuOiAnUHl0aG9uJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWd1aWRlJywgZW46ICdlbi1ndWlkZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdTREsnLCBlbjogJ1NESycgfSxcbiAgICBvcmRlcjogMSxcbiAgfSxcbiAge1xuICAgIHNvdXJjZTogJ2RvY3MvdXNlci9ndWlkZS9naXRodWItcmV2aWV3Lm1kJyxcbiAgICByb3V0ZTogJ2d1aWRlL2dpdGh1Yi1yZXZpZXcubWQnLFxuICAgIGxhYmVsOiB7IHJvb3Q6ICdHaXRIdWIgXHU4QkM0XHU1QkExXHU0RjFBXHU4QkREJywgZW46ICdHaXRIdWIgcmV2aWV3IHNlc3Npb25zJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWd1aWRlJywgZW46ICdlbi1ndWlkZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTgxRUFcdTUyQThcdTUzMTYnLCBlbjogJ0F1dG9tYXRpb24nIH0sXG4gICAgb3JkZXI6IDEsXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZ3VpZGUvc2NoZWR1bGUubWQnLFxuICAgIHJvdXRlOiAnZ3VpZGUvc2NoZWR1bGUubWQnLFxuICAgIGxhYmVsOiB7IHJvb3Q6ICdcdTRGMUFcdThCRERcdTUxODVcdTYzRDBcdTkxOTInLCBlbjogJ1Nlc3Npb24gcmVtaW5kZXJzJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWd1aWRlJywgZW46ICdlbi1ndWlkZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTgxRUFcdTUyQThcdTUzMTYnLCBlbjogJ0F1dG9tYXRpb24nIH0sXG4gICAgb3JkZXI6IDIsXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZ3VpZGUvbWNwLW1lbW9yeS5tZCcsXG4gICAgcm91dGU6ICdndWlkZS9tY3AtbWVtb3J5Lm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU4QkIwXHU1RkM2IE1DUCcsIGVuOiAnTWVtb3J5IE1DUCcgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1ndWlkZScsIGVuOiAnZW4tZ3VpZGUnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU5NkM2XHU2MjEwJywgZW46ICdJbnRlZ3JhdGlvbnMnIH0sXG4gICAgb3JkZXI6IDEsXG4gIH0sXG5dKVxuXG5jb25zdCBkZXZlbG9wID0gcGFpcmVkUGFnZXMoW1xuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2RldmVsb3AvYmFzaWMvaW5kZXgubWQnLFxuICAgIHJvdXRlOiAnZGV2ZWxvcC9iYXNpYy9pbmRleC5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ1x1N0IyQ1x1NEUwMFx1NEUyQSBIYXJuZXNzIFx1NjNEMlx1NEVGNicsIGVuOiAnWW91ciBmaXJzdCBIYXJuZXNzIHBsdWdpbicgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1kZXZlbG9wJywgZW46ICdlbi1kZXZlbG9wJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1NTdGQVx1Nzg0MCcsIGVuOiAnQmFzaWNzJyB9LFxuICAgIG9yZGVyOiAxLFxuICAgIHNvdXJjZUFsaWFzZXM6IFsnZG9jcy91c2VyL2RldmVsb3AvYmFzaWMnXSxcbiAgfSxcbiAge1xuICAgIHNvdXJjZTogJ2RvY3MvdXNlci9kZXZlbG9wL2Jhc2ljL3Rvb2wubWQnLFxuICAgIHJvdXRlOiAnZGV2ZWxvcC9iYXNpYy90b29sLm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU1RjAwXHU1M0QxXHU0RTAwXHU0RTJBIFRvb2wnLCBlbjogJ0J1aWxkIGEgdG9vbCcgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1kZXZlbG9wJywgZW46ICdlbi1kZXZlbG9wJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1NTdGQVx1Nzg0MCcsIGVuOiAnQmFzaWNzJyB9LFxuICAgIG9yZGVyOiAyLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2RldmVsb3AvYmFzaWMvY29uZmlnLm1kJyxcbiAgICByb3V0ZTogJ2RldmVsb3AvYmFzaWMvY29uZmlnLm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU2M0QyXHU0RUY2XHU5MTREXHU3RjZFJywgZW46ICdQbHVnaW4gY29uZmlndXJhdGlvbicgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1kZXZlbG9wJywgZW46ICdlbi1kZXZlbG9wJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1NTdGQVx1Nzg0MCcsIGVuOiAnQmFzaWNzJyB9LFxuICAgIG9yZGVyOiAzLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2RldmVsb3AvYmFzaWMvcHVibGlzaC5tZCcsXG4gICAgcm91dGU6ICdkZXZlbG9wL2Jhc2ljL3B1Ymxpc2gubWQnLFxuICAgIGxhYmVsOiB7IHJvb3Q6ICdcdTYyNTNcdTUzMDVcdTRFMEVcdTVCODlcdTg4QzVcdTYzRDJcdTRFRjYnLCBlbjogJ1BhY2thZ2UgYW5kIGluc3RhbGwnIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtZGV2ZWxvcCcsIGVuOiAnZW4tZGV2ZWxvcCcgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTU3RkFcdTc4NDAnLCBlbjogJ0Jhc2ljcycgfSxcbiAgICBvcmRlcjogNCxcbiAgfSxcbiAge1xuICAgIHNvdXJjZTogJ2RvY3MvdXNlci9kZXZlbG9wL2ZyYW1ld29yay9pbmRleC5tZCcsXG4gICAgcm91dGU6ICdkZXZlbG9wL2ZyYW1ld29yay9pbmRleC5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ1x1NjNEMlx1NEVGNlx1NEUwRVx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRicsIGVuOiAnUGx1Z2luIGxpZmVjeWNsZScgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1kZXZlbG9wJywgZW46ICdlbi1kZXZlbG9wJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1Njg0Nlx1NjdCNlx1ODBGRFx1NTI5QicsIGVuOiAnRnJhbWV3b3JrJyB9LFxuICAgIG9yZGVyOiAxLFxuICAgIHNvdXJjZUFsaWFzZXM6IFsnZG9jcy91c2VyL2RldmVsb3AvZnJhbWV3b3JrJ10sXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZGV2ZWxvcC9mcmFtZXdvcmsvc2VydmljZS5tZCcsXG4gICAgcm91dGU6ICdkZXZlbG9wL2ZyYW1ld29yay9zZXJ2aWNlLm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU2NzBEXHU1MkExXHU0RTBFXHU0RjlEXHU4RDU2JywgZW46ICdTZXJ2aWNlcyBhbmQgZGVwZW5kZW5jaWVzJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWRldmVsb3AnLCBlbjogJ2VuLWRldmVsb3AnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU2ODQ2XHU2N0I2XHU4MEZEXHU1MjlCJywgZW46ICdGcmFtZXdvcmsnIH0sXG4gICAgb3JkZXI6IDIsXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZGV2ZWxvcC9mcmFtZXdvcmsvZXZlbnRzLm1kJyxcbiAgICByb3V0ZTogJ2RldmVsb3AvZnJhbWV3b3JrL2V2ZW50cy5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ1x1NEU4Qlx1NEVGNlx1N0NGQlx1N0VERicsIGVuOiAnRXZlbnQgc3lzdGVtJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWRldmVsb3AnLCBlbjogJ2VuLWRldmVsb3AnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU2ODQ2XHU2N0I2XHU4MEZEXHU1MjlCJywgZW46ICdGcmFtZXdvcmsnIH0sXG4gICAgb3JkZXI6IDMsXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZGV2ZWxvcC9wcmFjdGljZS9pbmRleC5tZCcsXG4gICAgcm91dGU6ICdkZXZlbG9wL3ByYWN0aWNlL2luZGV4Lm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnXHU4MEZEXHU1MjlCXHU3Njg0XHU0RTA5XHU1QzQyXHU2MkM2XHU1MjA2JywgZW46ICdDYXBhYmlsaXR5IGxheWVyaW5nJyB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLWRldmVsb3AnLCBlbjogJ2VuLWRldmVsb3AnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU1QjlFXHU2MjE4JywgZW46ICdQcmFjdGljZScgfSxcbiAgICBvcmRlcjogMSxcbiAgICBzb3VyY2VBbGlhc2VzOiBbJ2RvY3MvdXNlci9kZXZlbG9wL3ByYWN0aWNlJ10sXG4gIH0sXG4gIHtcbiAgICBzb3VyY2U6ICdkb2NzL3VzZXIvZGV2ZWxvcC9wcmFjdGljZS9sbG0tYWRhcHRlci5tZCcsXG4gICAgcm91dGU6ICdkZXZlbG9wL3ByYWN0aWNlL2xsbS1hZGFwdGVyLm1kJyxcbiAgICBsYWJlbDogeyByb290OiAnTExNIFx1OTAwMlx1OTE0RFx1NTY2OCcsIGVuOiAnTExNIGFkYXB0ZXInIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtZGV2ZWxvcCcsIGVuOiAnZW4tZGV2ZWxvcCcgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTVCOUVcdTYyMTgnLCBlbjogJ1ByYWN0aWNlJyB9LFxuICAgIG9yZGVyOiAyLFxuICB9LFxuICB7XG4gICAgc291cmNlOiAnZG9jcy91c2VyL2RldmVsb3AvcHJhY3RpY2UvZHluYW1pYy1jb3JkaXMubWQnLFxuICAgIHJvdXRlOiAnZGV2ZWxvcC9wcmFjdGljZS9keW5hbWljLWNvcmRpcy5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ1x1NjMwMVx1NEU0NVx1NTMxNiBIYXJuZXNzIFx1NjNEMlx1NEVGNicsIGVuOiAnUGVyc2lzdGVudCBIYXJuZXNzIHBsdWdpbnMnIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtZGV2ZWxvcCcsIGVuOiAnZW4tZGV2ZWxvcCcgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTVCOUVcdTYyMTgnLCBlbjogJ1ByYWN0aWNlJyB9LFxuICAgIG9yZGVyOiAzLFxuICB9LFxuXSlcblxuY29uc3QgY29yZGlzVHV0b3JpYWwgPSBwYWlyZWRQYWdlcygoW1xuICBbJ2luZGV4Lm1kJywgJ1x1NjAzQlx1ODlDOCcsICdPdmVydmlldyddLFxuICBbJzAxLWZpcnN0LXBsdWdpbi5tZCcsICcxLiBcdTdCMkNcdTRFMDBcdTRFMkFcdTYzRDJcdTRFRjYnLCAnMS4gWW91ciBmaXJzdCBwbHVnaW4nXSxcbiAgWycwMi1saWZlY3ljbGUtYW5kLWVmZmVjdHMubWQnLCAnMi4gXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXHU0RTBFXHU1MjZGXHU0RjVDXHU3NTI4JywgJzIuIExpZmVjeWNsZSBhbmQgZWZmZWN0cyddLFxuICBbJzAzLXNlcnZpY2VzLm1kJywgJzMuIFx1NjcwRFx1NTJBMScsICczLiBTZXJ2aWNlcyddLFxuICBbJzA0LWV2ZW50cy5tZCcsICc0LiBcdTRFOEJcdTRFRjYnLCAnNC4gRXZlbnRzJ10sXG4gIFsnMDUtY29uZmlnLm1kJywgJzUuIFx1OTE0RFx1N0Y2RScsICc1LiBDb25maWd1cmF0aW9uJ10sXG4gIFsnMDYtY29tcG9zaXRpb24tYW5kLWhtci5tZCcsICc2LiBcdTdFQzRcdTU0MDhcdTRFMEVcdTcwRURcdTkxQ0RcdThGN0QnLCAnNi4gQ29tcG9zaXRpb24gYW5kIEhNUiddLFxuICBbJzA3LWludG8tdGhlLWhhcm5lc3MubWQnLCAnNy4gXHU4RkRCXHU1MTY1IEhhcm5lc3MnLCAnNy4gSW50byB0aGUgaGFybmVzcyddLFxuXSBhcyBjb25zdCkubWFwKChbZmlsZSwgcm9vdExhYmVsLCBlbkxhYmVsXSwgb3JkZXIpOiBQYWlyZWRQYWdlID0+ICh7XG4gIHNvdXJjZTogYGRvY3MvY29yZGlzLXR1dG9yaWFsLyR7ZmlsZX1gLFxuICByb3V0ZTogYGRldmVsb3AvY29yZGlzLXR1dG9yaWFsLyR7ZmlsZX1gLFxuICBsYWJlbDogeyByb290OiByb290TGFiZWwsIGVuOiBlbkxhYmVsIH0sXG4gIHNpZGViYXI6IHsgcm9vdDogJ3poLWRldmVsb3AnLCBlbjogJ2VuLWRldmVsb3AnIH0sXG4gIHNlY3Rpb246IHsgcm9vdDogJ0NvcmRpcyBcdTY4NDZcdTY3QjZcdTY1NTlcdTdBMEInLCBlbjogJ0NvcmRpcyBmcmFtZXdvcmsgdHV0b3JpYWwnIH0sXG4gIG9yZGVyLFxuICAuLi4oZmlsZSA9PT0gJ2luZGV4Lm1kJyA/IHsgc291cmNlQWxpYXNlczogWydkb2NzL2NvcmRpcy10dXRvcmlhbCddIH0gOiB7fSksXG59KSkpXG5cbmNvbnN0IGNvcmRpc1ByaW1lclJlZmVyZW5jZSA9IHBhaXJlZFBhZ2VzKFtcbiAge1xuICAgIHNvdXJjZTogJ2RvY3MvY29yZGlzLXByaW1lci5tZCcsXG4gICAgcm91dGU6ICdyZWZlcmVuY2UvY29yZGlzLXByaW1lci5tZCcsXG4gICAgbGFiZWw6IHsgcm9vdDogJ0NvcmRpcyBcdTUxNjVcdTk1RTgnLCBlbjogJ0NvcmRpcyBwcmltZXInIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtcmVmZXJlbmNlJywgZW46ICdlbi1yZWZlcmVuY2UnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU2OTgyXHU1RkY1JywgZW46ICdDb25jZXB0cycgfSxcbiAgICBvcmRlcjogMSxcbiAgfSxcbl0pXG5cbi8qKlxuICogU3Vic3lzdGVtIHBhZ2VzIGdyb3VwZWQgYnkgdGhlIGNvbmNlcm4gdGhleSBkb2N1bWVudCwgYXMgYFtDaGluZXNlIHNlY3Rpb24sXG4gKiBFbmdsaXNoIHNlY3Rpb24sIHBhZ2VzXWAuIE9uZSBmbGF0IGxpc3Qgb2YgZXZlcnkgc3Vic3lzdGVtIHB1c2hlZCB0aGUgcmVzdCBvZlxuICogdGhlIHJlZmVyZW5jZSBzaWRlYmFyIGJlbG93IHRoZSBmb2xkLlxuICovXG5jb25zdCBzdWJzeXN0ZW1Hcm91cHMgPSBbXG4gIFsnXHU2MDNCXHU4OUM4JywgJ092ZXJ2aWV3JywgW1xuICAgIFsnUkVBRE1FLm1kJywgJ1x1NUI1MFx1N0NGQlx1N0VERicsICdTdWJzeXN0ZW1zJ10sXG4gIF1dLFxuICBbJ1x1NTE4NVx1NjgzOFx1NEUwRVx1NEY1Q1x1NzUyOFx1NTdERicsICdDb3JlIGFuZCBzY29wZXMnLCBbXG4gICAgWydjb3JlLm1kJywgJ1x1NjgzOFx1NUZDMycsICdDb3JlJ10sXG4gICAgWydzY29wZS5tZCcsICdcdTRGNUNcdTc1MjhcdTU3REYnLCAnU2NvcGVzJ10sXG4gICAgWydpbnZhcmlhbnRzLm1kJywgJ1x1OEZEMFx1ODg0Q1x1NjVGNlx1NEUwRFx1NTNEOFx1NUYwRicsICdSdW50aW1lIGludmFyaWFudHMnXSxcbiAgXV0sXG4gIFsnXHU0RjFBXHU4QkREXHU0RTBFXHU2MzAxXHU0RTQ1XHU1MzE2JywgJ1Nlc3Npb25zIGFuZCBwZXJzaXN0ZW5jZScsIFtcbiAgICBbJ3Nlc3Npb24ubWQnLCAnXHU0RjFBXHU4QkREJywgJ1Nlc3Npb25zJ10sXG4gICAgWydzZXNzaW9uLXF1ZXJ5Lm1kJywgJ1x1NEYxQVx1OEJERFx1NjdFNVx1OEJFMicsICdTZXNzaW9uIHF1ZXJ5J10sXG4gICAgWydzZXNzaW9uLXJlZmVyZW5jZS5tZCcsICdcdTRGMUFcdThCRERcdTVGMTVcdTc1MjgnLCAnU2Vzc2lvbiByZWZlcmVuY2VzJ10sXG4gICAgWydzZXNzaW9uLXRpdGxlLm1kJywgJ1x1NEYxQVx1OEJERFx1NjgwN1x1OTg5OCcsICdTZXNzaW9uIHRpdGxlcyddLFxuICAgIFsnc2Vzc2lvbi1wcm9qZWN0aW9uLm1kJywgJ1x1NEYxQVx1OEJERFx1NjI5NVx1NUY3MScsICdTZXNzaW9uIHByb2plY3Rpb25zJ10sXG4gICAgWydwZXJzaXN0ZW5jZS5tZCcsICdcdTRGMUFcdThCRERcdTYzMDFcdTRFNDVcdTUzMTYnLCAnU2Vzc2lvbiBwZXJzaXN0ZW5jZSddLFxuICAgIFsnc3BpbGwubWQnLCAnU3BpbGwgXHU1QjU4XHU1MEE4JywgJ1NwaWxsIHN0b3JhZ2UnXSxcbiAgICBbJ3Nlc3Npb24tdGVsZW1ldHJ5Lm1kJywgJ1x1OTA2NVx1NkQ0QicsICdTZXNzaW9uVGVsZW1ldHJ5QmFja2VuZCddLFxuICBdXSxcbiAgWydcdTZBMjFcdTU3OEJcdTRFMEVcdTRFMEFcdTRFMEJcdTY1ODcnLCAnTW9kZWwgYW5kIGNvbnRleHQnLCBbXG4gICAgWydsbG0tc3RyZWFtaW5nLm1kJywgJ0xMTSBcdTZENDFcdTVGMEZcdTU0Q0RcdTVFOTQnLCAnTExNIHN0cmVhbWluZyddLFxuICAgIFsndG9rZW4tbWV0ZXIubWQnLCAnVG9rZW4gXHU4QkExXHU5MUNGJywgJ1Rva2VuIG1ldGVyaW5nJ10sXG4gICAgWydzeXN0ZW0tcHJvbXB0Lm1kJywgJ1x1N0NGQlx1N0VERlx1NjNEMFx1NzkzQVx1OEJDRCcsICdTeXN0ZW0gcHJvbXB0cyddLFxuICAgIFsnY29tcGFjdGlvbi5tZCcsICdcdTRFMEFcdTRFMEJcdTY1ODdcdTUzOEJcdTdGMjknLCAnQ29tcGFjdGlvbiddLFxuICBdXSxcbiAgWydcdTYyNjdcdTg4NENcdTRFMEVcdTVERTVcdTUxNzcnLCAnRXhlY3V0aW9uIGFuZCB0b29scycsIFtcbiAgICBbJ3Rvb2xzLm1kJywgJ1x1NURFNVx1NTE3NycsICdUb29scyddLFxuICAgIFsnc2hlbGwubWQnLCAnQmFzaCBcdTYyNjdcdTg4NEMnLCAnQmFzaCBleGVjdXRpb24nXSxcbiAgICBbJ3N1YnByb2Nlc3MubWQnLCAnXHU1QjUwXHU4RkRCXHU3QTBCJywgJ1N1YnByb2Nlc3NlcyddLFxuICAgIFsndGVybWluYWwubWQnLCAnUFRZIFx1NEYxQVx1OEJERCcsICdQVFkgc2Vzc2lvbnMnXSxcbiAgICBbJ2pvYnMubWQnLCAnXHU1NDBFXHU1M0YwXHU0RUZCXHU1MkExJywgJ0JhY2tncm91bmQgam9icyddLFxuICAgIFsnZmlsZXN5c3RlbS5tZCcsICdcdTY1ODdcdTRFRjZcdTdDRkJcdTdFREYnLCAnRmlsZXN5c3RlbSddLFxuICAgIFsnbHNwLm1kJywgJ0xTUCBcdTVCRkNcdTgyMkEnLCAnTFNQIG5hdmlnYXRpb24nXSxcbiAgICBbJ3B0Yy1ydW50aW1lLm1kJywgJ1BUQyBcdThGRDBcdTg4NENcdTY1RjYnLCAnUFRDIHJ1bnRpbWUnXSxcbiAgICBbJ3dlYi5tZCcsICdXZWIgXHU4QkJGXHU5NUVFJywgJ1dlYiBhY2Nlc3MnXSxcbiAgICBbJ3NraWxscy5tZCcsICdcdTYyODBcdTgwRkQnLCAnU2tpbGxzJ10sXG4gICAgWyd3b3JrZmxvdy5tZCcsICdcdTVERTVcdTRGNUNcdTZENDEnLCAnV29ya2Zsb3dzJ10sXG4gICAgWydzdWJhZ2VudC5tZCcsICdcdTVCNTBcdTRFRTNcdTc0MDYnLCAnU3ViYWdlbnRzJ10sXG4gIF1dLFxuICBbJ1x1N0I1Nlx1NzU2NVx1NEUwRVx1NEVBNFx1NEU5MicsICdQb2xpY3kgYW5kIGludGVyYWN0aW9uJywgW1xuICAgIFsnYXBwcm92YWwubWQnLCAnXHU1QkExXHU2Mjc5JywgJ0FwcHJvdmFscyddLFxuICAgIFsncGVybWlzc2lvbi1wcmVzZXRzLm1kJywgJ1x1Njc0M1x1OTY1MFx1OTg4NFx1OEJCRScsICdQZXJtaXNzaW9uIHByZXNldHMnXSxcbiAgICBbJ3NhbmRib3gubWQnLCAnXHU2Qzk5XHU3QkIxJywgJ1NhbmRib3hpbmcnXSxcbiAgICBbJ3BsYW4ubWQnLCAnXHU4QkExXHU1MjEyXHU2QTIxXHU1RjBGJywgJ1BsYW4gbW9kZSddLFxuICAgIFsndXNlci1xdWVzdGlvbnMubWQnLCAnXHU3NTI4XHU2MjM3XHU0RUE0XHU0RTkyJywgJ1VzZXIgaW50ZXJhY3Rpb24nXSxcbiAgICBbJ2NvbW1hbmRzLm1kJywgJ1x1NTQ3RFx1NEVFNCcsICdIdW1hbiBjb21tYW5kcyddLFxuICAgIFsnZ29hbC5tZCcsICdcdTc2RUVcdTY4MDcnLCAnR29hbHMnXSxcbiAgICBbJ3NjaGVkdWxlLm1kJywgJ1x1NUI5QVx1NjVGNlx1NjNEMFx1OTE5MicsICdTY2hlZHVsZWQgcmVtaW5kZXJzJ10sXG4gIF1dLFxuICBbJ1x1NUU3M1x1NTNGMFx1NEUwRVx1NjNBNVx1NTE2NScsICdQbGF0Zm9ybSBhbmQgYWNjZXNzJywgW1xuICAgIFsnd2ViLXNlcnZlci5tZCcsICdIVFRQIFx1NjcwRFx1NTJBMVx1NTY2OCcsICdIVFRQIHNlcnZlciddLFxuICAgIFsnd2ViLWNsaWVudC5tZCcsICdXZWIgQ2xpZW50IFx1NjdCNlx1Njc4NCcsICdXZWIgQ2xpZW50IGFyY2hpdGVjdHVyZSddLFxuICAgIFsnY2xpZW50LW1vZHVsZXMubWQnLCAnXHU1QkEyXHU2MjM3XHU3QUVGXHU2QTIxXHU1NzU3JywgJ0NsaWVudCBtb2R1bGVzJ10sXG4gICAgWydzbG90cy5tZCcsICdcdTVCQTJcdTYyMzdcdTdBRUYgU2xvdHMnLCAnQ2xpZW50IHNsb3RzJ10sXG4gICAgWydjbGllbnQtcmVzb3VyY2VzLm1kJywgJ1x1NUJBMlx1NjIzN1x1N0FFRlx1OEQ0NFx1NkU5MCcsICdDbGllbnQgcmVzb3VyY2VzJ10sXG4gICAgWydzaWRlYmFyLXJpZ2h0Lm1kJywgJ1x1NTNGM1x1NEZBNyBTaWRlYmFyJywgJ1JpZ2h0IFNpZGViYXInXSxcbiAgICBbJ2NvbnZlcnNhdGlvbi5tZCcsICdDb252ZXJzYXRpb24gXHU3RUM0XHU4OEM1JywgJ0NvbnZlcnNhdGlvbiBhc3NlbWJseSddLFxuICAgIFsndHlwZXJ0Lm1kJywgJ1R5cGVydCcsICdUeXBlcnQnXSxcbiAgICBbJ3N0b3JhZ2UubWQnLCAnXHU1QjU4XHU1MEE4JywgJ1N0b3JhZ2UnXSxcbiAgICBbJ3dvcmtzcGFjZS5tZCcsICdcdTVERTVcdTRGNUNcdTUzM0EnLCAnV29ya3NwYWNlcyddLFxuICAgIFsnc2V0dGluZ3MubWQnLCAnXHU3NTI4XHU2MjM3XHU4QkJFXHU3RjZFJywgJ1VzZXIgc2V0dGluZ3MnXSxcbiAgICBbJ2NyZWRlbnRpYWxzLm1kJywgJ1x1NzUyOFx1NjIzN1x1NTFFRFx1NjM2RScsICdVc2VyIGNyZWRlbnRpYWxzJ10sXG4gIF1dLFxuXSBhcyBjb25zdFxuXG5jb25zdCBzdWJzeXN0ZW1zUmVmZXJlbmNlID0gc3Vic3lzdGVtR3JvdXBzLmZsYXRNYXAoKFtyb290U2VjdGlvbiwgZW5TZWN0aW9uLCBmaWxlc10pID0+IHBhaXJlZFBhZ2VzKFxuICBmaWxlcy5tYXAoKFtmaWxlLCByb290TGFiZWwsIGVuTGFiZWxdLCBvcmRlcik6IFBhaXJlZFBhZ2UgPT4gKHtcbiAgICBzb3VyY2U6IGBkb2NzL3N1YnN5c3RlbXMvJHtmaWxlfWAsXG4gICAgcm91dGU6IGZpbGUgPT09ICdSRUFETUUubWQnID8gJ3JlZmVyZW5jZS9zdWJzeXN0ZW1zL2luZGV4Lm1kJyA6IGByZWZlcmVuY2Uvc3Vic3lzdGVtcy8ke2ZpbGV9YCxcbiAgICBsYWJlbDogeyByb290OiByb290TGFiZWwsIGVuOiBlbkxhYmVsIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtcmVmZXJlbmNlJywgZW46ICdlbi1yZWZlcmVuY2UnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiByb290U2VjdGlvbiwgZW46IGVuU2VjdGlvbiB9LFxuICAgIG9yZGVyLFxuICAgIC8vIFN1YnN5c3RlbSBwYWdlcyBjYXJyeSBsb25nIHRoaXJkLWxldmVsIHNlY3Rpb25zIGEgdHdvLWxldmVsIG91dGxpbmUgcmVhY2hlcy5cbiAgICBvdXRsaW5lOiBbMiwgM10sXG4gICAgLi4uKGZpbGUgPT09ICdSRUFETUUubWQnID8geyBzb3VyY2VBbGlhc2VzOiBbJ2RvY3Mvc3Vic3lzdGVtcyddIH0gOiB7fSksXG4gIH0pKSxcbikpXG5cbmNvbnN0IHJlZmVyZW5jZSA9IFtcbiAgLy8gYGRvY3MvZGVlcHNlZWstbGxtLWFwaS13aXJlLWV4dGVuc2lvbnMubWRgIGlzIGEgcmVwb3NpdG9yeS1vbmx5IHByb3ZpZGVyIHByb3RvY29sIHJlZmVyZW5jZS5cbiAgLy8gUHJvamVjdGVkIGxpbmtzIGludGVudGlvbmFsbHkgcmVzb2x2ZSB0byBpdHMgR2l0SHViIHNvdXJjZSBpbnN0ZWFkIG9mIGEgcHVibGljIHNpdGUgcm91dGUuXG4gIC4uLnBhaXJlZFBhZ2VzKChbXG4gICAgWydkb2NzL2FyY2hpdGVjdHVyZS5tZCcsICdyZWZlcmVuY2UvaW5kZXgubWQnLCAnXHU2N0I2XHU2Nzg0JywgJ0FyY2hpdGVjdHVyZScsIDBdLFxuICBdIGFzIGNvbnN0KS5tYXAoKFtzb3VyY2UsIHJvdXRlLCByb290TGFiZWwsIGVuTGFiZWwsIG9yZGVyXSk6IFBhaXJlZFBhZ2UgPT4gKHtcbiAgICBzb3VyY2UsXG4gICAgcm91dGUsXG4gICAgbGFiZWw6IHsgcm9vdDogcm9vdExhYmVsLCBlbjogZW5MYWJlbCB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLXJlZmVyZW5jZScsIGVuOiAnZW4tcmVmZXJlbmNlJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ1x1Njk4Mlx1NUZGNScsIGVuOiAnQ29uY2VwdHMnIH0sXG4gICAgb3JkZXIsXG4gIH0pKSksXG4gIC4uLnBhaXJlZFBhZ2VzKChbXG4gICAgWydkb2NzL2NhcGFiaWxpdHktc2VhbXMubWQnLCAncmVmZXJlbmNlL2NhcGFiaWxpdHktc2VhbXMubWQnLCAnXHU4MEZEXHU1MjlCXHU2NzBEXHU1MkExJywgJ0NhcGFiaWxpdHkgc2VydmljZXMnLCAyXSxcbiAgICBbJ2RvY3MvYWdlbnQtbGlmZWN5Y2xlLm1kJywgJ3JlZmVyZW5jZS9hZ2VudC1saWZlY3ljbGUubWQnLCAnQWdlbnQgXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGJywgJ0FnZW50IGxpZmVjeWNsZScsIDNdLFxuICAgIFsnZG9jcy90b29sLWV4ZWN1dGlvbi1waXBlbGluZS5tZCcsICdyZWZlcmVuY2UvdG9vbC1leGVjdXRpb24tcGlwZWxpbmUubWQnLCAnVG9vbCBcdTYyNjdcdTg4NEMnLCAnVG9vbCBleGVjdXRpb24nLCA0XSxcbiAgICBbJ2RvY3MvYXBpLWdhdGV3YXkubWQnLCAncmVmZXJlbmNlL2FwaS1nYXRld2F5Lm1kJywgJ0FQSSBHYXRld2F5JywgJ0FQSSBHYXRld2F5JywgNV0sXG4gIF0gYXMgY29uc3QpLm1hcCgoW3NvdXJjZSwgcm91dGUsIHJvb3RMYWJlbCwgZW5MYWJlbCwgb3JkZXJdKTogUGFpcmVkUGFnZSA9PiAoe1xuICAgIHNvdXJjZSxcbiAgICByb3V0ZSxcbiAgICBsYWJlbDogeyByb290OiByb290TGFiZWwsIGVuOiBlbkxhYmVsIH0sXG4gICAgc2lkZWJhcjogeyByb290OiAnemgtcmVmZXJlbmNlJywgZW46ICdlbi1yZWZlcmVuY2UnIH0sXG4gICAgc2VjdGlvbjogeyByb290OiAnXHU2OTgyXHU1RkY1JywgZW46ICdDb25jZXB0cycgfSxcbiAgICBvcmRlcixcbiAgfSkpKSxcbiAgLi4ucGFpcmVkUGFnZXMoKFtcbiAgICBbJ2RvY3MvY29uZmlnLWNhdGFsb2cubWQnLCAncmVmZXJlbmNlL2NvbmZpZy1jYXRhbG9nLm1kJywgJ1x1NjNEMlx1NEVGNlx1OTE0RFx1N0Y2RScsICdQbHVnaW4gY29uZmlndXJhdGlvbiddLFxuICAgIFsnZG9jcy90b29sLWNhdGFsb2cubWQnLCAncmVmZXJlbmNlL3Rvb2wtY2F0YWxvZy5tZCcsICdUb29sIFNjaGVtYScsICdUb29sIHNjaGVtYXMnXSxcbiAgICBbJ2RvY3MvcGVyc2lzdGVuY2UtY2F0YWxvZy5tZCcsICdyZWZlcmVuY2UvcGVyc2lzdGVuY2UtY2F0YWxvZy5tZCcsICdcdTYzMDFcdTRFNDVcdTUzMTZcdTRFOEJcdTRFRjYnLCAnUGVyc2lzdGVuY2UgZXZlbnRzJywgJ2RlZXAnXSxcbiAgXSBhcyBjb25zdCkubWFwKChbc291cmNlLCByb3V0ZSwgcm9vdExhYmVsLCBlbkxhYmVsLCBvdXRsaW5lXSwgb3JkZXIpOiBQYWlyZWRQYWdlID0+ICh7XG4gICAgc291cmNlLFxuICAgIHJvdXRlLFxuICAgIGxhYmVsOiB7IHJvb3Q6IHJvb3RMYWJlbCwgZW46IGVuTGFiZWwgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1yZWZlcmVuY2UnLCBlbjogJ2VuLXJlZmVyZW5jZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTc1MUZcdTYyMTBcdTUzQzJcdTgwMDMnLCBlbjogJ0dlbmVyYXRlZCByZWZlcmVuY2UnIH0sXG4gICAgb3JkZXIsXG4gICAgLi4uKG91dGxpbmUgPT09IHVuZGVmaW5lZCA/IHt9IDogeyBvdXRsaW5lIH0pLFxuICB9KSkpLFxuICAuLi5wYWlyZWRQYWdlcygoW1xuICAgIFsnY29udGV4dC5tZCcsICdDb250ZXh0JywgJ0NvbnRleHQnXSxcbiAgICBbJ2V2ZW50cy5tZCcsICdFdmVudHMnLCAnRXZlbnRzJ10sXG4gICAgWydmaWJlci5tZCcsICdGaWJlcicsICdGaWJlciddLFxuICAgIFsncmVnaXN0cnkubWQnLCAnUGx1Z2luIFJlZ2lzdHJ5JywgJ1BsdWdpbiBSZWdpc3RyeSddLFxuICAgIFsnc2VydmljZS5tZCcsICdTZXJ2aWNlJywgJ1NlcnZpY2UnXSxcbiAgXSBhcyBjb25zdCkubWFwKChbZmlsZSwgcm9vdExhYmVsLCBlbkxhYmVsXSwgb3JkZXIpOiBQYWlyZWRQYWdlID0+ICh7XG4gICAgc291cmNlOiBgZG9jcy9jb3JkaXMtYXBpLyR7ZmlsZX1gLFxuICAgIHJvdXRlOiBgcmVmZXJlbmNlL2NvcmRpcy1hcGkvJHtmaWxlfWAsXG4gICAgbGFiZWw6IHsgcm9vdDogcm9vdExhYmVsLCBlbjogZW5MYWJlbCB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLXJlZmVyZW5jZScsIGVuOiAnZW4tcmVmZXJlbmNlJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ0NvcmRpcyBBUEknLCBlbjogJ0NvcmRpcyBDb3JlIEFQSScgfSxcbiAgICBvcmRlcixcbiAgfSkpKSxcbiAgLi4ubWlycm9yZWRQYWdlcygoW1xuICAgIFsnaW5oZXJpdGVkLm1kJywgJ1x1N0VFN1x1NjI3Rlx1NjNBNVx1NTNFM1x1OTc2MicsICdJbmhlcml0ZWQgc3VyZmFjZSddLFxuICBdIGFzIGNvbnN0KS5tYXAoKFtmaWxlLCByb290TGFiZWwsIGVuTGFiZWxdLCBvcmRlcik6IE1pcnJvcmVkUGFnZSA9PiAoe1xuICAgIHNvdXJjZTogYGRvY3MvY29yZGlzLWFwaS8ke2ZpbGV9YCxcbiAgICByb3V0ZTogYHJlZmVyZW5jZS9jb3JkaXMtYXBpLyR7ZmlsZX1gLFxuICAgIGNvbnRlbnRMb2NhbGU6ICdlbi1VUycsXG4gICAgbGFiZWw6IHsgcm9vdDogcm9vdExhYmVsLCBlbjogZW5MYWJlbCB9LFxuICAgIHNpZGViYXI6IHsgcm9vdDogJ3poLXJlZmVyZW5jZScsIGVuOiAnZW4tcmVmZXJlbmNlJyB9LFxuICAgIHNlY3Rpb246IHsgcm9vdDogJ0NvcmRpcyBBUEknLCBlbjogJ0NvcmRpcyBDb3JlIEFQSScgfSxcbiAgICBvcmRlcjogb3JkZXIgKyA1LFxuICB9KSkpLFxuICAuLi5wYWlyZWRQYWdlcygoW1xuICAgIFsnYWRkaW5nLWEtcGFja2FnZS5tZCcsICdcdTY1QjBcdTU4OUUgUGFja2FnZScsICdBZGRpbmcgYSBwYWNrYWdlJ10sXG4gICAgWydhZGRpbmctYS10b29sLm1kJywgJ1x1NjVCMFx1NTg5RSBUb29sJywgJ0FkZGluZyBhIHRvb2wnXSxcbiAgICBbJ2FkZGluZy1hbi1sbG0tYWRhcHRlci5tZCcsICdcdTY1QjBcdTU4OUUgTExNIEFkYXB0ZXInLCAnQWRkaW5nIGFuIExMTSBhZGFwdGVyJ10sXG4gICAgWydhZGRpbmctYS1zZXR0aW5ncy1jYXJkLm1kJywgJ1x1NjVCMFx1NTg5RVx1OEJCRVx1N0Y2RVx1NTM2MVx1NzI0NycsICdBZGRpbmcgYSBzZXR0aW5ncyBjYXJkJ10sXG4gICAgWydleHRlbnNpb24tY29va2Jvb2subWQnLCAnXHU2MjY5XHU1QzU1XHU2QTIxXHU1RjBGJywgJ0V4dGVuc2lvbiBwYXR0ZXJucyddLFxuICBdIGFzIGNvbnN0KS5tYXAoKFtmaWxlLCByb290TGFiZWwsIGVuTGFiZWxdLCBvcmRlcik6IFBhaXJlZFBhZ2UgPT4gKHtcbiAgICBzb3VyY2U6IGBkb2NzL2Nvb2tib29rLyR7ZmlsZX1gLFxuICAgIHJvdXRlOiBgcmVmZXJlbmNlL2Nvb2tib29rLyR7ZmlsZX1gLFxuICAgIGxhYmVsOiB7IHJvb3Q6IHJvb3RMYWJlbCwgZW46IGVuTGFiZWwgfSxcbiAgICBzaWRlYmFyOiB7IHJvb3Q6ICd6aC1yZWZlcmVuY2UnLCBlbjogJ2VuLXJlZmVyZW5jZScgfSxcbiAgICBzZWN0aW9uOiB7IHJvb3Q6ICdcdTVGMDBcdTUzRDFcdTYyNEJcdTUxOEMnLCBlbjogJ0Nvb2tib29rJyB9LFxuICAgIG9yZGVyLFxuICB9KSkpLFxuXVxuXG4vKipcbiAqIFNpZGViYXIgY29sbGVjdGlvbnMgb2YgZWFjaCBsb2NhbGUsIGluIHRoZSBvcmRlciB0aGUgc2l0ZSdzIG5hdmlnYXRpb25cbiAqIHByZXNlbnRzIHRoZW0uIFRoZSBuYXZpZ2F0aW9uIGJhciBhbmQgdGhlIGxsbXMudHh0IGluZGV4IGJvdGggcmVhZCB0aGlzXG4gKiBzZXF1ZW5jZSwgc28gYSBuZXcgY29sbGVjdGlvbiBsYW5kcyBpbiBib3RoIHN1cmZhY2VzIHRvZ2V0aGVyLlxuICovXG5leHBvcnQgY29uc3QgbG9jYWxlQ29sbGVjdGlvbnMgPSB7XG4gIHJvb3Q6IFsnemgtZ3VpZGUnLCAnemgtZGV2ZWxvcCcsICd6aC1yZWZlcmVuY2UnXSxcbiAgZW46IFsnZW4tZ3VpZGUnLCAnZW4tZGV2ZWxvcCcsICdlbi1yZWZlcmVuY2UnXSxcbn0gYXMgY29uc3Qgc2F0aXNmaWVzIFJlY29yZDxEb2NzTG9jYWxlLCByZWFkb25seSBEb2NzU2lkZWJhcltdPlxuXG4vKiogQSBzaWRlYmFyIGdyb3VwLCBtYXRjaGVkIHRvIHBhZ2VzIGJ5IGBsYWJlbGAuICovXG5leHBvcnQgaW50ZXJmYWNlIERvY3NTZWN0aW9uIHtcbiAgLyoqIEdyb3VwIGhlYWRpbmcsIGVxdWFsIHRvIHRoZSBgc2VjdGlvbmAgZmllbGQgb2YgZXZlcnkgcGFnZSBpdCBob2xkcy4gKi9cbiAgbGFiZWw6IHN0cmluZ1xuICAvKiogUmVuZGVyIHRoZSBncm91cCBjb2xsYXBzZWQgdW50aWwgaXQgaG9sZHMgdGhlIHBhZ2UgYmVpbmcgcmVhZC4gKi9cbiAgY29sbGFwc2VkPzogYm9vbGVhblxufVxuXG4vKipcbiAqIEV2ZXJ5IHNpZGViYXIgZ3JvdXAsIGluIHRoZSBvcmRlciBpdHMgbG9jYWxlIHJlbmRlcnMgaXQuXG4gKlxuICogVGhlIHN1YnN5c3RlbSBncm91cHMgY29sbGFwc2UgYmVjYXVzZSB0b2dldGhlciB0aGV5IG91dG51bWJlciB0aGUgcmVzdCBvZiB0aGVcbiAqIHJlZmVyZW5jZSBzaWRlYmFyOyBleHBhbmRlZCwgdGhleSBwdXNoIGV2ZXJ5IG90aGVyIGdyb3VwIGJlbG93IHRoZSBmb2xkLlxuICovXG5jb25zdCBzZWN0aW9uczogUmVjb3JkPERvY3NMb2NhbGUsIHJlYWRvbmx5IERvY3NTZWN0aW9uW10+ID0ge1xuICByb290OiBbXG4gICAgeyBsYWJlbDogJ1x1NTE2NVx1OTVFOCcgfSwgeyBsYWJlbDogJ1NESycgfSwgeyBsYWJlbDogJ1x1ODFFQVx1NTJBOFx1NTMxNicgfSwgeyBsYWJlbDogJ1x1OTZDNlx1NjIxMCcgfSxcbiAgICB7IGxhYmVsOiAnXHU1N0ZBXHU3ODQwJyB9LCB7IGxhYmVsOiAnXHU2ODQ2XHU2N0I2XHU4MEZEXHU1MjlCJyB9LCB7IGxhYmVsOiAnXHU1QjlFXHU2MjE4JyB9LCB7IGxhYmVsOiAnQ29yZGlzIFx1Njg0Nlx1NjdCNlx1NjU1OVx1N0EwQicgfSxcbiAgICB7IGxhYmVsOiAnXHU2OTgyXHU1RkY1JyB9LCB7IGxhYmVsOiAnXHU3NTFGXHU2MjEwXHU1M0MyXHU4MDAzJyB9LCB7IGxhYmVsOiAnQ29yZGlzIEFQSScgfSwgeyBsYWJlbDogJ1x1NUYwMFx1NTNEMVx1NjI0Qlx1NTE4QycgfSxcbiAgICB7IGxhYmVsOiAnXHU2MDNCXHU4OUM4JyB9LFxuICAgIHsgbGFiZWw6ICdcdTUxODVcdTY4MzhcdTRFMEVcdTRGNUNcdTc1MjhcdTU3REYnLCBjb2xsYXBzZWQ6IHRydWUgfSxcbiAgICB7IGxhYmVsOiAnXHU0RjFBXHU4QkREXHU0RTBFXHU2MzAxXHU0RTQ1XHU1MzE2JywgY29sbGFwc2VkOiB0cnVlIH0sXG4gICAgeyBsYWJlbDogJ1x1NkEyMVx1NTc4Qlx1NEUwRVx1NEUwQVx1NEUwQlx1NjU4NycsIGNvbGxhcHNlZDogdHJ1ZSB9LFxuICAgIHsgbGFiZWw6ICdcdTYyNjdcdTg4NENcdTRFMEVcdTVERTVcdTUxNzcnLCBjb2xsYXBzZWQ6IHRydWUgfSxcbiAgICB7IGxhYmVsOiAnXHU3QjU2XHU3NTY1XHU0RTBFXHU0RUE0XHU0RTkyJywgY29sbGFwc2VkOiB0cnVlIH0sXG4gICAgeyBsYWJlbDogJ1x1NUU3M1x1NTNGMFx1NEUwRVx1NjNBNVx1NTE2NScsIGNvbGxhcHNlZDogdHJ1ZSB9LFxuICBdLFxuICBlbjogW1xuICAgIHsgbGFiZWw6ICdHdWlkZScgfSwgeyBsYWJlbDogJ1NESycgfSwgeyBsYWJlbDogJ0F1dG9tYXRpb24nIH0sIHsgbGFiZWw6ICdJbnRlZ3JhdGlvbnMnIH0sXG4gICAgeyBsYWJlbDogJ0Jhc2ljcycgfSwgeyBsYWJlbDogJ0ZyYW1ld29yaycgfSwgeyBsYWJlbDogJ1ByYWN0aWNlJyB9LCB7IGxhYmVsOiAnQ29yZGlzIGZyYW1ld29yayB0dXRvcmlhbCcgfSxcbiAgICB7IGxhYmVsOiAnQ29uY2VwdHMnIH0sIHsgbGFiZWw6ICdHZW5lcmF0ZWQgcmVmZXJlbmNlJyB9LCB7IGxhYmVsOiAnQ29yZGlzIENvcmUgQVBJJyB9LCB7IGxhYmVsOiAnQ29va2Jvb2snIH0sXG4gICAgeyBsYWJlbDogJ092ZXJ2aWV3JyB9LFxuICAgIHsgbGFiZWw6ICdDb3JlIGFuZCBzY29wZXMnLCBjb2xsYXBzZWQ6IHRydWUgfSxcbiAgICB7IGxhYmVsOiAnU2Vzc2lvbnMgYW5kIHBlcnNpc3RlbmNlJywgY29sbGFwc2VkOiB0cnVlIH0sXG4gICAgeyBsYWJlbDogJ01vZGVsIGFuZCBjb250ZXh0JywgY29sbGFwc2VkOiB0cnVlIH0sXG4gICAgeyBsYWJlbDogJ0V4ZWN1dGlvbiBhbmQgdG9vbHMnLCBjb2xsYXBzZWQ6IHRydWUgfSxcbiAgICB7IGxhYmVsOiAnUG9saWN5IGFuZCBpbnRlcmFjdGlvbicsIGNvbGxhcHNlZDogdHJ1ZSB9LFxuICAgIHsgbGFiZWw6ICdQbGF0Zm9ybSBhbmQgYWNjZXNzJywgY29sbGFwc2VkOiB0cnVlIH0sXG4gIF0sXG59XG5cbi8qKlxuICogUGxhY2VtZW50IGFuZCBjb2xsYXBzZSBiZWhhdmlvciBvZiBvbmUgc2lkZWJhciBncm91cC5cbiAqXG4gKiBAcGFyYW0gbG9jYWxlIC0gUm91dGUgdHJlZSB3aG9zZSBzaWRlYmFyIGlzIGJlaW5nIGJ1aWx0LlxuICogQHBhcmFtIGxhYmVsIC0gU2VjdGlvbiBsYWJlbCBjYXJyaWVkIGJ5IHRoZSBwYWdlcyBpbiB0aGUgZ3JvdXAuXG4gKiBAcmV0dXJucyBUaGUgZGVjbGFyZWQgZ3JvdXAsIHBsdXMgaXRzIHplcm8tYmFzZWQgcG9zaXRpb24gaW4gdGhlIGxvY2FsZS5cbiAqIEB0aHJvd3MgV2hlbiB0aGUgbG9jYWxlIGRlY2xhcmVzIG5vIHBsYWNlbWVudCBmb3IgdGhlIGxhYmVsLiBSYW5raW5nIGJ5IGxpc3RcbiAqICAgbWVtYmVyc2hpcCBhbG9uZSB3b3VsZCBzb3J0IGFuIHVuZGVjbGFyZWQgZ3JvdXAgc2lsZW50bHkgYWhlYWQgb2YgZXZlcnlcbiAqICAgZGVjbGFyZWQgb25lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VjdGlvblNwZWMobG9jYWxlOiBEb2NzTG9jYWxlLCBsYWJlbDogc3RyaW5nKTogRG9jc1NlY3Rpb24gJiB7IGluZGV4OiBudW1iZXIgfSB7XG4gIGNvbnN0IGRlY2xhcmVkID0gc2VjdGlvbnNbbG9jYWxlXVxuICBjb25zdCBzZWN0aW9uID0gZGVjbGFyZWQuZmluZChjYW5kaWRhdGUgPT4gY2FuZGlkYXRlLmxhYmVsID09PSBsYWJlbClcbiAgaWYgKHNlY3Rpb24gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKGBTaWRlYmFyIHNlY3Rpb24gXCIke2xhYmVsfVwiIGhhcyBubyBwbGFjZW1lbnQgaW4gdGhlICR7bG9jYWxlfSBsb2NhbGUuYClcbiAgcmV0dXJuIHsgLi4uc2VjdGlvbiwgaW5kZXg6IGRlY2xhcmVkLmluZGV4T2Yoc2VjdGlvbikgfVxufVxuXG4vKiogRXZlcnkgY2Fub25pY2FsIHBhZ2UgcHVibGlzaGVkIGJ5IHRoZSBkb2N1bWVudGF0aW9uIHdlYnNpdGUuICovXG5leHBvcnQgY29uc3QgZG9jc1BhZ2VzOiBEb2NzUGFnZVtdID0gW1xuICAuLi5ob21lQW5kR3VpZGUsXG4gIC4uLmRldmVsb3AsXG4gIC4uLmNvcmRpc1R1dG9yaWFsLFxuICAuLi5jb3JkaXNQcmltZXJSZWZlcmVuY2UsXG4gIC4uLnN1YnN5c3RlbXNSZWZlcmVuY2UsXG4gIC4uLnJlZmVyZW5jZSxcbl1cblxuLyoqXG4gKiBQYWdlcyBvZiBvbmUgc2lkZWJhciBjb2xsZWN0aW9uLCBpbiB0aGUgb3JkZXIgdGhlIHNpZGViYXIgbGlzdHMgdGhlbS5cbiAqXG4gKiBAcGFyYW0gbG9jYWxlIC0gUm91dGUgdHJlZSB3aG9zZSBzaWRlYmFyIGlzIGJlaW5nIGJ1aWx0LlxuICogQHBhcmFtIGNvbGxlY3Rpb24gLSBTaWRlYmFyIGNvbGxlY3Rpb24gdG8gcmVhZC5cbiAqIEByZXR1cm5zIFRoZSBjb2xsZWN0aW9uJ3MgcGFnZXMsIG9yZGVyZWQgYnkgc2VjdGlvbiBwbGFjZW1lbnQgdGhlbiBieSBgb3JkZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJlZFBhZ2VzKGxvY2FsZTogRG9jc0xvY2FsZSwgY29sbGVjdGlvbjogRG9jc1NpZGViYXIpOiBEb2NzUGFnZVtdIHtcbiAgcmV0dXJuIGRvY3NQYWdlc1xuICAgIC5maWx0ZXIocGFnZSA9PiBwYWdlLmxvY2FsZSA9PT0gbG9jYWxlICYmIHBhZ2Uuc2lkZWJhciA9PT0gY29sbGVjdGlvbilcbiAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IChcbiAgICAgIHNlY3Rpb25TcGVjKGxvY2FsZSwgbGVmdC5zZWN0aW9uKS5pbmRleCAtIHNlY3Rpb25TcGVjKGxvY2FsZSwgcmlnaHQuc2VjdGlvbikuaW5kZXhcbiAgICAgIHx8IGxlZnQub3JkZXIgLSByaWdodC5vcmRlclxuICAgICkpXG59XG5cbi8qKlxuICogU2l0ZS1yZWxhdGl2ZSBsaW5rIGZvciBhIHB1Ymxpc2hlZCByb3V0ZS5cbiAqXG4gKiBAcGFyYW0gcm91dGUgLSBNYW5pZmVzdCByb3V0ZSwgaW5jbHVkaW5nIGl0cyBgLm1kYCBzdWZmaXguXG4gKiBAcmV0dXJucyBUaGUgbGluayBWaXRlUHJlc3Mgc2VydmVzIHRoZSByb3V0ZSBhdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdXRlTGluayhyb3V0ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAvJHtyb3V0ZS5yZXBsYWNlKC8oPzppbmRleCk/XFwubWQkLywgJycpfWBcbn1cblxuLyoqXG4gKiBXaGVyZSBhIHRvcC1sZXZlbCBuYXZpZ2F0aW9uIGl0ZW0gbGFuZHMuXG4gKlxuICogVGhlIHRhcmdldCBpcyBkZXJpdmVkIHJhdGhlciB0aGFuIHdyaXR0ZW4gZG93bjogYSBjb2xsZWN0aW9uIHdob3NlIGZpcnN0IHBhZ2VcbiAqIGlzIHJlbmFtZWQgb3IgcmVvcmRlcmVkIHdvdWxkIG90aGVyd2lzZSBsZWF2ZSB0aGUgbmF2aWdhdGlvbiBiYXIgcG9pbnRpbmcgYXRcbiAqIGEgcm91dGUgdGhlIG1hbmlmZXN0IG5vIGxvbmdlciBwdWJsaXNoZXMuXG4gKlxuICogQHBhcmFtIGxvY2FsZSAtIFJvdXRlIHRyZWUgdGhlIG5hdmlnYXRpb24gaXRlbSBiZWxvbmdzIHRvLlxuICogQHBhcmFtIGNvbGxlY3Rpb24gLSBTaWRlYmFyIGNvbGxlY3Rpb24gdGhlIGl0ZW0gb3BlbnMuXG4gKiBAcmV0dXJucyBTaXRlLXJlbGF0aXZlIGxpbmsgb2YgdGhlIGNvbGxlY3Rpb24ncyBmaXJzdCBwYWdlLlxuICogQHRocm93cyBXaGVuIHRoZSBjb2xsZWN0aW9uIHB1Ymxpc2hlcyBubyBwYWdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbGFuZGluZ0xpbmsobG9jYWxlOiBEb2NzTG9jYWxlLCBjb2xsZWN0aW9uOiBEb2NzU2lkZWJhcik6IHN0cmluZyB7XG4gIGNvbnN0IGZpcnN0ID0gb3JkZXJlZFBhZ2VzKGxvY2FsZSwgY29sbGVjdGlvbilbMF1cbiAgaWYgKGZpcnN0ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcihgU2lkZWJhciBjb2xsZWN0aW9uIFwiJHtjb2xsZWN0aW9ufVwiIHB1Ymxpc2hlcyBubyBwYWdlLmApXG4gIHJldHVybiByb3V0ZUxpbmsoZmlyc3Qucm91dGUpXG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXFx1NjVCMFx1NTIxQlx1NjEwRlx1Njc4NFx1NjAxRFxcXFxDbHVzdGVyLUNvb3BlcmF0aW9uXFxcXGRlZXBzZWVrLWhhcm5lc3NcXFxcc2NyaXB0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcXHU2NUIwXHU1MjFCXHU2MTBGXHU2Nzg0XHU2MDFEXFxcXENsdXN0ZXItQ29vcGVyYXRpb25cXFxcZGVlcHNlZWstaGFybmVzc1xcXFxzY3JpcHRzXFxcXHByb2plY3QtZG9jLXNpdGUudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6LyVFNiU5NiVCMCVFNSU4OCU5QiVFNiU4NCU4RiVFNiU5RSU4NCVFNiU4MCU5RC9DbHVzdGVyLUNvb3BlcmF0aW9uL2RlZXBzZWVrLWhhcm5lc3Mvc2NyaXB0cy9wcm9qZWN0LWRvYy1zaXRlLnRzXCI7LyoqXG4gKiBCdWlsZC10aW1lIHByb2plY3Rpb24gZnJvbSBjYW5vbmljYWwgcmVwb3NpdG9yeSBNYXJrZG93biBpbnRvIFZpdGVQcmVzcy5cbiAqXG4gKiBUaGUgZ2VuZXJhdGVkIHRyZWUgaXMgZGlzcG9zYWJsZTogc291cmNlcyBzdGF5IGluIHRoZWlyIG93bmluZyBgZG9jcy9gXG4gKiB0aWVyLCB3aGlsZSB0aGlzIGFkYXB0ZXIgcmV3cml0ZXMgY3Jvc3Mtc291cmNlIGxpbmtzIGZvciB0aGUgcHVibGljIHNpdGUuXG4gKiBUaGUgc2FtZSBwcm9qZWN0aW9uIGFsc28gZW1pdHMgYSByYXctTWFya2Rvd24gdHdpbiBvZiBldmVyeSByb3V0ZSBpbnRvIHRoZVxuICogYnVpbGQgb3V0cHV0LCBzbyBhIHBhZ2UncyBVUkwsIG1pbnVzIGFueSB0cmFpbGluZyBzbGFzaCwgcGx1cyBgLm1kYCBzZXJ2ZXNcbiAqIGl0IGFzIHBsYWluIE1hcmtkb3duLlxuICovXG5cbmltcG9ydCB7XG4gIGNvcHlGaWxlU3luYywgZXhpc3RzU3luYywgbHN0YXRTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgcmVhbHBhdGhTeW5jLCBybVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jLFxufSBmcm9tICdub2RlOmZzJ1xuaW1wb3J0IHsgYmFzZW5hbWUsIGRpcm5hbWUsIGV4dG5hbWUsIHBvc2l4LCByZWxhdGl2ZSwgcmVzb2x2ZSwgc2VwIH0gZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZnJvbU1hcmtkb3duIH0gZnJvbSAnbWRhc3QtdXRpbC1mcm9tLW1hcmtkb3duJ1xuaW1wb3J0IHsgZ2ZtRnJvbU1hcmtkb3duIH0gZnJvbSAnbWRhc3QtdXRpbC1nZm0nXG5pbXBvcnQgeyBnZm0gfSBmcm9tICdtaWNyb21hcmstZXh0ZW5zaW9uLWdmbSdcbmltcG9ydCB0eXBlIHsgTm9kZXMgfSBmcm9tICdtZGFzdCdcbmltcG9ydCB7IGRvY3NQYWdlcywgbG9jYWxlQ29sbGVjdGlvbnMsIG9yZGVyZWRQYWdlcywgdHlwZSBEb2NzTG9jYWxlLCB0eXBlIERvY3NQYWdlIH0gZnJvbSAnLi4vd2Vic2l0ZS9kb2NzLnRzJ1xuaW1wb3J0IHtcbiAgaXNFeHRlcm5hbE9yQWJzb2x1dGVNYXJrZG93blVybCxcbiAgbWFya2Rvd25EZXN0aW5hdGlvbixcbiAgc3BsaXRNYXJrZG93blVybFRhcmdldCxcbn0gZnJvbSAnLi9tYXJrZG93bi50cydcblxuY29uc3QgUkVQT1NJVE9SWV9VUkwgPSAnaHR0cHM6Ly9naXRodWIuY29tL2RlZXBzZWVrLWFpL2RlZXBzZWVrLWhhcm5lc3MnXG5jb25zdCByb290ID0gcmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCAnLi4nKVxuY29uc3QgZ2VuZXJhdGVkUm9vdCA9IHJlc29sdmUocm9vdCwgJ3dlYnNpdGUvLmdlbmVyYXRlZCcpXG5cbi8qKlxuICogUmVzb2x2ZSB0aGUgcHVibGljIHJlcG9zaXRvcnkgcmVmIHVzZWQgYnkgcHJvamVjdGVkIHNvdXJjZSBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gZW52aXJvbm1lbnQgQnVpbGQgZW52aXJvbm1lbnQgY29udGFpbmluZyBhbiBvcHRpb25hbCBleHBsaWNpdCBwdWJsaWMgcmVmLlxuICogQHJldHVybnMgVGhlIGNvbmZpZ3VyZWQgcHVibGljIHJlZiwgb3IgYG1hc3RlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlUmVwb3NpdG9yeVJlZihlbnZpcm9ubWVudDogTm9kZUpTLlByb2Nlc3NFbnYpOiBzdHJpbmcge1xuICByZXR1cm4gZW52aXJvbm1lbnQuRE9DU19SRVBPU0lUT1JZX1JFRiA/PyAnbWFzdGVyJ1xufVxuXG5pbnRlcmZhY2UgUmVwbGFjZW1lbnQge1xuICBzdGFydDogbnVtYmVyXG4gIGVuZDogbnVtYmVyXG4gIHZhbHVlOiBzdHJpbmdcbn1cblxudHlwZSBSZXdyaXRhYmxlTm9kZSA9IEV4dHJhY3Q8Tm9kZXMsIHsgdHlwZTogJ2xpbmsnIHwgJ2ltYWdlJyB8ICdkZWZpbml0aW9uJyB9PlxuXG4vKiogSW5wdXRzIGZvciByZXdyaXRpbmcgb25lIGNhbm9uaWNhbCBNYXJrZG93biBwYWdlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXdyaXRlTWFya2Rvd25PcHRpb25zIHtcbiAgbG9jYWxlOiBEb2NzTG9jYWxlXG4gIHNvdXJjZVBhdGg6IHN0cmluZ1xuICByb3V0ZTogc3RyaW5nXG4gIHBhZ2VzOiBEb2NzUGFnZVtdXG4gIHJlcG9Sb290OiBzdHJpbmdcbiAgcmVwb3NpdG9yeVJlZjogc3RyaW5nXG4gIC8qKlxuICAgKiBQbGFjZSBvbmUgcmVmZXJlbmNlZCBpbWFnZSBiZXNpZGUgdGhlIHByb2plY3RlZCBwYWdlIGFuZCByZXR1cm4gdGhlIFVSTCB0b1xuICAgKiByZWFjaCBpdCBmcm9tIHRoYXQgcGFnZS4gQSBHaXRIdWIgcmF3IFVSTCBjYW5ub3Qgc2VydmUgdGhpcyByZXBvc2l0b3J5IFx1MjAxNFxuICAgKiBgcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbWAgYW5zd2VycyA0MDQgZm9yIGEgcHJpdmF0ZSBvbmUsIGFuZCBubyByZWFkZXIgb2ZcbiAgICogdGhlIHNpdGUgaXMgYXV0aGVudGljYXRlZCB0byBpdCBcdTIwMTQgc28gYW4gaW1hZ2UgdHJhdmVscyBpbnRvIHRoZSBnZW5lcmF0ZWRcbiAgICogdHJlZSBhbmQgVml0ZSBidW5kbGVzIGl0IGxpa2UgYW55IG90aGVyIHNpdGUgYXNzZXQuIE9taXR0ZWQgYnkgY2FsbGVycyB0aGF0XG4gICAqIG9ubHkgcmV3cml0ZSB0ZXh0LCB3aGljaCB0aGVuIGxlYXZlIGltYWdlcyBwb2ludGluZyBhdCB0aGUgcmVwb3NpdG9yeS5cbiAgICovXG4gIHBsYWNlSW1hZ2U/OiAoYWJzUGF0aDogc3RyaW5nKSA9PiBzdHJpbmdcbn1cblxuZnVuY3Rpb24gcmVwb1BhdGgoYWJzUGF0aDogc3RyaW5nLCByZXBvUm9vdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlbGF0aXZlKHJlcG9Sb290LCBhYnNQYXRoKS5zcGxpdChzZXApLmpvaW4oJy8nKVxufVxuXG4vLyBgI2ZyYWdtZW50YCBzdWZmaXhlcyBwYXNzIHRocm91Z2ggdmVyYmF0aW0uIEdlbmVyYXRlZCBjb3JkaXMtc3VyZmFjZVxuLy8gaGVhZGluZ3MgY2FycnkgZXhwbGljaXQgYDxhIGlkPmAgYW5jaG9ycyB3aXRoIHRoZSBHaXRIdWIgc2x1Zywgc28gdGhvc2Vcbi8vIGZyYWdtZW50cyByZXNvbHZlIG9uIHRoZSBwdWJsaXNoZWQgc2l0ZSB0b287IGhhbmQtd3JpdHRlbiBoZWFkaW5ncyByZWx5IG9uXG4vLyBWaXRlUHJlc3MncyBvd24gc2x1Z2dlciwgd2hpY2ggZGlmZmVycyBmcm9tIEdpdEh1YidzIGZvciBwdW5jdHVhdGlvbi1oZWF2eVxuLy8gdGV4dCBcdTIwMTQgaGFuZC1hdXRob3JlZCBjcm9zcy1wYWdlIGZyYWdtZW50cyBzaG91bGQgcHJlZmVyIHBsYWluLXRleHQgaGVhZGluZ3Ncbi8vIG9yIGV4cGxpY2l0IGFuY2hvcnMuXG5mdW5jdGlvbiBkZWNvZGVQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYXRoKVxuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHByb2plY3QtZG9jLXNpdGU6IG1hbGZvcm1lZCBwZXJjZW50IGVzY2FwZSBpbiAke0pTT04uc3RyaW5naWZ5KHBhdGgpfS5gKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJvdXRlVGFyZ2V0KGZyb21Sb3V0ZTogc3RyaW5nLCB0b1JvdXRlOiBzdHJpbmcsIHN1ZmZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdGFyZ2V0ID0gcG9zaXgucmVsYXRpdmUocG9zaXguZGlybmFtZShmcm9tUm91dGUpLCB0b1JvdXRlKVxuICByZXR1cm4gYCR7dGFyZ2V0LnN0YXJ0c1dpdGgoJy4nKSA/IHRhcmdldCA6IGAuLyR7dGFyZ2V0fWB9JHtzdWZmaXh9YFxufVxuXG5mdW5jdGlvbiBzb3VyY2VNYXAocGFnZXM6IERvY3NQYWdlW10pOiBNYXA8c3RyaW5nLCBNYXA8RG9jc0xvY2FsZSwgRG9jc1BhZ2U+PiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8RG9jc0xvY2FsZSwgRG9jc1BhZ2U+PigpXG4gIGZvciAoY29uc3QgcGFnZSBvZiBwYWdlcykge1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIFtwYWdlLnNvdXJjZSwgLi4uKHBhZ2Uuc291cmNlQWxpYXNlcyA/PyBbXSldKSB7XG4gICAgICBjb25zdCBsb2NhbGl6ZWQgPSBtYXAuZ2V0KHNvdXJjZSkgPz8gbmV3IE1hcDxEb2NzTG9jYWxlLCBEb2NzUGFnZT4oKVxuICAgICAgaWYgKGxvY2FsaXplZC5oYXMocGFnZS5sb2NhbGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcHJvamVjdC1kb2Mtc2l0ZTogZHVwbGljYXRlIHNvdXJjZSBvciBhbGlhcyAke0pTT04uc3RyaW5naWZ5KHNvdXJjZSl9IGZvciBsb2NhbGUgJHtKU09OLnN0cmluZ2lmeShwYWdlLmxvY2FsZSl9LmApXG4gICAgICB9XG4gICAgICBsb2NhbGl6ZWQuc2V0KHBhZ2UubG9jYWxlLCBwYWdlKVxuICAgICAgbWFwLnNldChzb3VyY2UsIGxvY2FsaXplZClcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hcFxufVxuXG5mdW5jdGlvbiBjb3VudGVycGFydFNvdXJjZShzb3VyY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzb3VyY2UuZW5kc1dpdGgoJy56aC5tZCcpXG4gICAgPyBzb3VyY2UucmVwbGFjZSgvXFwuemhcXC5tZCQvLCAnLm1kJylcbiAgICA6IHNvdXJjZS5yZXBsYWNlKC9cXC5tZCQvLCAnLnpoLm1kJylcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVJlcG9zaXRvcnlUYXJnZXQoc291cmNlQWJzOiBzdHJpbmcsIHJhd1BhdGg6IHN0cmluZywgcmVwb1Jvb3Q6IHN0cmluZyk6IHsgYWJzUGF0aDogc3RyaW5nOyBsaW5lPzogbnVtYmVyIH0ge1xuICBjb25zdCBkZWNvZGVkID0gZGVjb2RlUGF0aChyYXdQYXRoKVxuICBsZXQgYWJzUGF0aCA9IHJlc29sdmUoZGlybmFtZShzb3VyY2VBYnMpLCBkZWNvZGVkKVxuICBpZiAoZXhpc3RzU3luYyhhYnNQYXRoKSkgcmV0dXJuIHsgYWJzUGF0aCB9XG5cbiAgY29uc3QgbGluZU1hdGNoID0gZGVjb2RlZC5tYXRjaCgvOihcXGQrKSQvKVxuICBpZiAobGluZU1hdGNoICE9PSBudWxsKSB7XG4gICAgY29uc3QgbGluZVRleHQgPSBsaW5lTWF0Y2hbMV1cbiAgICBpZiAobGluZVRleHQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdwcm9qZWN0LWRvYy1zaXRlOiBsaW5lIHN1ZmZpeCBtYXRjaGVkIHdpdGhvdXQgYSBsaW5lIG51bWJlci4nKVxuICAgIGFic1BhdGggPSByZXNvbHZlKGRpcm5hbWUoc291cmNlQWJzKSwgZGVjb2RlZC5zbGljZSgwLCAtbGluZU1hdGNoWzBdLmxlbmd0aCkpXG4gICAgaWYgKGV4aXN0c1N5bmMoYWJzUGF0aCkpIHJldHVybiB7IGFic1BhdGgsIGxpbmU6IE51bWJlci5wYXJzZUludChsaW5lVGV4dCwgMTApIH1cbiAgfVxuXG4gIGlmIChleHRuYW1lKGRlY29kZWQpID09PSAnJykge1xuICAgIGNvbnN0IG1hcmtkb3duID0gcmVzb2x2ZShkaXJuYW1lKHNvdXJjZUFicyksIGAke2RlY29kZWR9Lm1kYClcbiAgICBpZiAoZXhpc3RzU3luYyhtYXJrZG93bikpIHJldHVybiB7IGFic1BhdGg6IG1hcmtkb3duIH1cbiAgICBjb25zdCBpbmRleCA9IHJlc29sdmUoZGlybmFtZShzb3VyY2VBYnMpLCBkZWNvZGVkLCAnaW5kZXgubWQnKVxuICAgIGlmIChleGlzdHNTeW5jKGluZGV4KSkgcmV0dXJuIHsgYWJzUGF0aDogaW5kZXggfVxuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBwcm9qZWN0LWRvYy1zaXRlOiAke3JlcG9QYXRoKHNvdXJjZUFicywgcmVwb1Jvb3QpfSBsaW5rcyB0byBtaXNzaW5nIHBhdGggJHtKU09OLnN0cmluZ2lmeShyYXdQYXRoKX0uYClcbn1cblxuZnVuY3Rpb24gZ2l0aHViVGFyZ2V0KFxuICBhYnNQYXRoOiBzdHJpbmcsXG4gIGxpbmU6IG51bWJlciB8IHVuZGVmaW5lZCxcbiAgc3VmZml4OiBzdHJpbmcsXG4gIHJlcG9zaXRvcnlSZWY6IHN0cmluZyxcbiAgcmVwb1Jvb3Q6IHN0cmluZyxcbiAgaW1hZ2U6IGJvb2xlYW4sXG4pOiBzdHJpbmcge1xuICBjb25zdCBwYXRoID0gcmVwb1BhdGgoYWJzUGF0aCwgcmVwb1Jvb3QpXG4gIGlmIChpbWFnZSkgcmV0dXJuIGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vZGVlcHNlZWstYWkvZGVlcHNlZWstaGFybmVzcy8ke3JlcG9zaXRvcnlSZWZ9LyR7cGF0aH0ke3N1ZmZpeH1gXG4gIGNvbnN0IGtpbmQgPSBsc3RhdFN5bmMoYWJzUGF0aCkuaXNEaXJlY3RvcnkoKSA/ICd0cmVlJyA6ICdibG9iJ1xuICBjb25zdCBsaW5lU3VmZml4ID0gbGluZSA9PT0gdW5kZWZpbmVkID8gc3VmZml4IDogYCNMJHtsaW5lfWBcbiAgcmV0dXJuIGAke1JFUE9TSVRPUllfVVJMfS8ke2tpbmR9LyR7cmVwb3NpdG9yeVJlZn0vJHtwYXRofSR7bGluZVN1ZmZpeH1gXG59XG5cbi8qKlxuICogUmV3cml0ZSByZXBvc2l0b3J5LXJlbGF0aXZlIGxpbmtzIHdpdGhvdXQgcmVzZXJpYWxpemluZyBNYXJrZG93bi5cbiAqXG4gKiBAcGFyYW0gc291cmNlIE1hcmtkb3duIHRleHQgZnJvbSB0aGUgY2Fub25pY2FsIGZpbGUuXG4gKiBAcGFyYW0gb3B0aW9ucyBTb3VyY2UsIHJvdXRlLCBtYW5pZmVzdCwgYW5kIHJlcG9zaXRvcnkgY29udGV4dC5cbiAqIEByZXR1cm5zIE1hcmtkb3duIHdob3NlIHB1Ymxpc2hlZCBsaW5rcyByZXNvbHZlIGluc2lkZSB0aGUgc2l0ZSBvciB0byBHaXRIdWIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXdyaXRlTWFya2Rvd24oc291cmNlOiBzdHJpbmcsIG9wdGlvbnM6IFJld3JpdGVNYXJrZG93bk9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCBzb3VyY2VBYnMgPSByZXNvbHZlKG9wdGlvbnMucmVwb1Jvb3QsIG9wdGlvbnMuc291cmNlUGF0aClcbiAgY29uc3QgcHVibGlzaGVkID0gc291cmNlTWFwKG9wdGlvbnMucGFnZXMpXG4gIGNvbnN0IHRyZWUgPSBmcm9tTWFya2Rvd24oc291cmNlLCB7IGV4dGVuc2lvbnM6IFtnZm0oKV0sIG1kYXN0RXh0ZW5zaW9uczogW2dmbUZyb21NYXJrZG93bigpXSB9KVxuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50W10gPSBbXVxuXG4gIGNvbnN0IHJld3JpdGUgPSAobm9kZTogUmV3cml0YWJsZU5vZGUpOiB2b2lkID0+IHtcbiAgICBpZiAoaXNFeHRlcm5hbE9yQWJzb2x1dGVNYXJrZG93blVybChub2RlLnVybCkpIHJldHVyblxuICAgIGNvbnN0IHsgcGF0aCwgc3VmZml4IH0gPSBzcGxpdE1hcmtkb3duVXJsVGFyZ2V0KG5vZGUudXJsKVxuICAgIGlmIChwYXRoID09PSAnJykgcmV0dXJuXG4gICAgY29uc3QgeyBhYnNQYXRoLCBsaW5lIH0gPSByZXNvbHZlUmVwb3NpdG9yeVRhcmdldChzb3VyY2VBYnMsIHBhdGgsIG9wdGlvbnMucmVwb1Jvb3QpXG4gICAgY29uc3QgdGFyZ2V0UGF0aCA9IHJlcG9QYXRoKGFic1BhdGgsIG9wdGlvbnMucmVwb1Jvb3QpXG4gICAgY29uc3QgaXNMYW5ndWFnZVN3aXRjaGVyID0gdGFyZ2V0UGF0aCA9PT0gY291bnRlcnBhcnRTb3VyY2Uob3B0aW9ucy5zb3VyY2VQYXRoKVxuICAgIGNvbnN0IHRhcmdldExvY2FsZTogRG9jc0xvY2FsZSA9IGlzTGFuZ3VhZ2VTd2l0Y2hlclxuICAgICAgPyBvcHRpb25zLmxvY2FsZSA9PT0gJ3Jvb3QnID8gJ2VuJyA6ICdyb290J1xuICAgICAgOiBvcHRpb25zLmxvY2FsZVxuICAgIGNvbnN0IHBhZ2UgPSBwdWJsaXNoZWQuZ2V0KHRhcmdldFBhdGgpPy5nZXQodGFyZ2V0TG9jYWxlKVxuICAgIGNvbnN0IG5leHRVcmwgPSBwYWdlICE9PSB1bmRlZmluZWRcbiAgICAgID8gcm91dGVUYXJnZXQob3B0aW9ucy5yb3V0ZSwgcGFnZS5yb3V0ZSwgc3VmZml4KVxuICAgICAgOiBub2RlLnR5cGUgPT09ICdpbWFnZScgJiYgb3B0aW9ucy5wbGFjZUltYWdlICE9PSB1bmRlZmluZWRcbiAgICAgICAgLy8gVGhlIHN1ZmZpeCByaWRlcyBhbG9uZyBleGFjdGx5IGFzIHRoZSBHaXRIdWIgYnJhbmNoIGtlZXBzIGl0OiBhbiBTVkdcbiAgICAgICAgLy8gdmlldyBmcmFnbWVudCBvciBhIFZpdGUgcXVlcnkgY2hhbmdlcyB3aGF0IHRoZSByZWZlcmVuY2UgbWVhbnMuXG4gICAgICAgID8gYCR7b3B0aW9ucy5wbGFjZUltYWdlKGFic1BhdGgpfSR7c3VmZml4fWBcbiAgICAgICAgOiBnaXRodWJUYXJnZXQoYWJzUGF0aCwgbGluZSwgc3VmZml4LCBvcHRpb25zLnJlcG9zaXRvcnlSZWYsIG9wdGlvbnMucmVwb1Jvb3QsIG5vZGUudHlwZSA9PT0gJ2ltYWdlJylcblxuICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gbWFya2Rvd25EZXN0aW5hdGlvbihzb3VyY2UsIG5vZGUpXG4gICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgc3RhcnQ6IGRlc3RpbmF0aW9uLnN0YXJ0LFxuICAgICAgZW5kOiBkZXN0aW5hdGlvbi5lbmQsXG4gICAgICB2YWx1ZTogbmV4dFVybCxcbiAgICB9KVxuICB9XG5cbiAgY29uc3QgdmlzaXQgPSAobm9kZTogTm9kZXMpOiB2b2lkID0+IHtcbiAgICBpZiAoKG5vZGUudHlwZSA9PT0gJ2xpbmsnIHx8IG5vZGUudHlwZSA9PT0gJ2ltYWdlJyB8fCBub2RlLnR5cGUgPT09ICdkZWZpbml0aW9uJykgJiYgJ3VybCcgaW4gbm9kZSkgcmV3cml0ZShub2RlKVxuICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikgdmlzaXQoY2hpbGQpXG4gICAgfVxuICB9XG4gIHZpc2l0KHRyZWUpXG5cbiAgbGV0IHByb2plY3RlZCA9IHNvdXJjZVxuICBmb3IgKGNvbnN0IHJlcGxhY2VtZW50IG9mIHJlcGxhY2VtZW50cy5zb3J0KChhLCBiKSA9PiBiLnN0YXJ0IC0gYS5zdGFydCkpIHtcbiAgICBwcm9qZWN0ZWQgPSBwcm9qZWN0ZWQuc2xpY2UoMCwgcmVwbGFjZW1lbnQuc3RhcnQpICsgcmVwbGFjZW1lbnQudmFsdWUgKyBwcm9qZWN0ZWQuc2xpY2UocmVwbGFjZW1lbnQuZW5kKVxuICB9XG4gIHJldHVybiBwcm9qZWN0ZWRcbn1cblxuLyoqXG4gKiBSZWNvcmQgY2Fub25pY2FsIGVkaXQgYW5kIHJhdy1NYXJrZG93biB0YXJnZXRzIGluIFZpdGVQcmVzcyBmcm9udG1hdHRlci5cbiAqXG4gKiBAcGFyYW0gbWFya2Rvd24gUHJvamVjdGVkIE1hcmtkb3duIGNvbnRlbnQuXG4gKiBAcGFyYW0gcGFnZSBQdWJsaWNhdGlvbiBtYW5pZmVzdCBlbnRyeSBmb3IgdGhlIGNvbnRlbnQuXG4gKiBAcmV0dXJucyBNYXJrZG93biB3aXRoIHByb2plY3Rpb24tb3duZWQgZnJvbnRtYXR0ZXIgZmllbGRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkUHJvamVjdGlvbkZyb250bWF0dGVyKG1hcmtkb3duOiBzdHJpbmcsIHBhZ2U6IFBpY2s8RG9jc1BhZ2UsICdzb3VyY2UnIHwgJ291dGxpbmUnIHwgJ3JvdXRlJyB8ICdzaWRlYmFyJz4pOiBzdHJpbmcge1xuICBjb25zdCBmaWVsZHMgPSBbXG4gICAgYGVkaXRTb3VyY2U6ICR7SlNPTi5zdHJpbmdpZnkocGFnZS5zb3VyY2UpfWAsXG4gICAgLi4uKHBhZ2Uuc2lkZWJhciA9PT0gbnVsbCA/IFtdIDogW2ByYXdNYXJrZG93blBhdGg6ICR7SlNPTi5zdHJpbmdpZnkocGFnZS5yb3V0ZSl9YF0pLFxuICAgIC4uLihwYWdlLm91dGxpbmUgPT09IHVuZGVmaW5lZCA/IFtdIDogW2BvdXRsaW5lOiAke0pTT04uc3RyaW5naWZ5KHBhZ2Uub3V0bGluZSl9YF0pLFxuICBdLmpvaW4oJ1xcbicpXG4gIGlmIChtYXJrZG93bi5zdGFydHNXaXRoKCctLS1cXG4nKSkgcmV0dXJuIG1hcmtkb3duLnJlcGxhY2UoJy0tLVxcbicsIGAtLS1cXG4ke2ZpZWxkc31cXG5gKVxuICByZXR1cm4gYC0tLVxcbiR7ZmllbGRzfVxcbi0tLVxcblxcbiR7bWFya2Rvd259YFxufVxuXG4vKiogVGhlIHN3aXRjaGVyIGxpbmUgYSBjYW5vbmljYWwgcGFnZSBjYXJyaWVzIHNvIGl0cyBHaXRIdWIgcmVhZGVyIGNhbiByZWFjaCB0aGUgb3RoZXIgbGFuZ3VhZ2UuICovXG5jb25zdCBMQU5HVUFHRV9TV0lUQ0hFUiA9IC9eKD86RW5nbGlzaCBcXHwgXFxbXHU0RTJEXHU2NTg3XFxdXFwoW14pXSpcXCl8XFxbRW5nbGlzaFxcXVxcKFteKV0qXFwpIFxcfCBcdTRFMkRcdTY1ODcpJC9cblxuLyoqIFRoZSByZXBvc2l0b3J5IGJhZGdlIGEgY2Fub25pY2FsIHBhZ2UgY2FycmllcyBmb3IgaXRzIEdpdEh1YiByZWFkZXIuICovXG5jb25zdCBSRVBPU0lUT1JZX0JBREdFID0gL15cXFshXFxbW15cXF1dKlxcXVxcKGh0dHBzOlxcL1xcL2ltZ1xcLnNoaWVsZHNcXC5pb1xcL1teKV0qXFwpXFxdXFwoW14pXSpcXCkkL1xuXG4vKipcbiAqIERyb3AgdGhlIGxpbmVzIHRoYXQgYWRkcmVzcyBhIGNhbm9uaWNhbCBwYWdlJ3MgR2l0SHViIHJlYWRlci5cbiAqXG4gKiBUaGUgc2l0ZSBjYXJyaWVzIGEgbG9jYWxlIHN3aXRjaGVyIGluIGl0cyBuYXZpZ2F0aW9uIGJhciBhbmQgbGlua3MgdGhlXG4gKiByZXBvc2l0b3J5IGZyb20gZXZlcnkgcGFnZSwgc28gcHJvamVjdGluZyB0aGVzZSBsaW5lcyB3b3VsZCByZXBlYXQgYm90aCBcdTIwMTQgdGhlXG4gKiBzd2l0Y2hlciBhcyB0aGUgZmlyc3QgZWxlbWVudCB1bmRlciBlYWNoIGhlYWRpbmcuXG4gKlxuICogQHBhcmFtIG1hcmtkb3duIFJld3JpdHRlbiBjYW5vbmljYWwgTWFya2Rvd24gY29udGVudC5cbiAqIEByZXR1cm5zIFRoZSBjb250ZW50IHdpdGhvdXQgdGhlIHN3aXRjaGVyIGxpbmUgb3IgdGhlIHJlcG9zaXRvcnkgYmFkZ2UuXG4gKi9cbmZ1bmN0aW9uIHdpdGhvdXRSZXBvc2l0b3J5Q2hyb21lKG1hcmtkb3duOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IG1hcmtkb3duLnNwbGl0KCdcXG4nKVxuICBjb25zdCBzd2l0Y2hlciA9IGxpbmVzLmZpbmRJbmRleChsaW5lID0+IExBTkdVQUdFX1NXSVRDSEVSLnRlc3QobGluZSkpXG4gIC8vIE9ubHkgdGhlIHN3aXRjaGVyIGludHJvZHVjaW5nIHRoZSBwYWdlIHF1YWxpZmllczsgZnVydGhlciBkb3duIHRoZSBzYW1lXG4gIC8vIHRleHQgaXMgcHJvc2Ugb3IgYSBzYW1wbGUgcmF0aGVyIHRoYW4gdGhlIHBhZ2UncyBvd24gaGVhZGVyLlxuICBpZiAoc3dpdGNoZXIgIT09IC0xICYmIHN3aXRjaGVyIDwgOCkge1xuICAgIGxpbmVzLnNwbGljZShzd2l0Y2hlciwgbGluZXNbc3dpdGNoZXIgKyAxXSA9PT0gJycgPyAyIDogMSlcbiAgfVxuICBjb25zdCBiYWRnZSA9IGxpbmVzLmZpbmRMYXN0SW5kZXgobGluZSA9PiBSRVBPU0lUT1JZX0JBREdFLnRlc3QobGluZSkpXG4gIGlmIChiYWRnZSAhPT0gLTEpIHtcbiAgICBsaW5lcy5zcGxpY2UobGluZXNbYmFkZ2UgLSAxXSA9PT0gJycgPyBiYWRnZSAtIDEgOiBiYWRnZSwgbGluZXNbYmFkZ2UgLSAxXSA9PT0gJycgPyAyIDogMSlcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJylcbn1cblxuLyoqXG4gKiBTZWxlY3QgdGhlIE1hcmtkb3duIHJlbmRlcmVkIGZvciBvbmUgcHVibGlzaGVkIHBhZ2UuXG4gKlxuICogQHBhcmFtIG1hcmtkb3duIFJld3JpdHRlbiBjYW5vbmljYWwgTWFya2Rvd24gY29udGVudC5cbiAqIEBwYXJhbSBwYWdlIFB1YmxpY2F0aW9uIG1hbmlmZXN0IGVudHJ5IGZvciB0aGUgY29udGVudC5cbiAqIEByZXR1cm5zIEZ1bGwgTWFya2Rvd24gZm9yIG9yZGluYXJ5IHBhZ2VzIG9yIGZyb250bWF0dGVyLW9ubHkgTWFya2Rvd24gZm9yIGEgbG9jYWxlIGhvbWUgcGFnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb2plY3RlZFBhZ2VDb250ZW50KG1hcmtkb3duOiBzdHJpbmcsIHBhZ2U6IERvY3NQYWdlKTogc3RyaW5nIHtcbiAgaWYgKHBhZ2Uuc2lkZWJhciAhPT0gbnVsbCkgcmV0dXJuIHdpdGhvdXRSZXBvc2l0b3J5Q2hyb21lKG1hcmtkb3duKVxuICBpZiAoIW1hcmtkb3duLnN0YXJ0c1dpdGgoJy0tLVxcbicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBwcm9qZWN0LWRvYy1zaXRlOiBsb2NhbGUgaG9tZSBzb3VyY2UgJHtKU09OLnN0cmluZ2lmeShwYWdlLnNvdXJjZSl9IG11c3Qgc3RhcnQgd2l0aCBZQU1MIGZyb250bWF0dGVyLmApXG4gIH1cbiAgY29uc3QgY2xvc2luZ0RlbGltaXRlciA9ICdcXG4tLS1cXG4nXG4gIGNvbnN0IGNsb3NpbmcgPSBtYXJrZG93bi5pbmRleE9mKGNsb3NpbmdEZWxpbWl0ZXIsIDQpXG4gIGlmIChjbG9zaW5nID09PSAtMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgcHJvamVjdC1kb2Mtc2l0ZTogbG9jYWxlIGhvbWUgc291cmNlICR7SlNPTi5zdHJpbmdpZnkocGFnZS5zb3VyY2UpfSBoYXMgdW5jbG9zZWQgWUFNTCBmcm9udG1hdHRlci5gKVxuICB9XG4gIHJldHVybiBtYXJrZG93bi5zbGljZSgwLCBjbG9zaW5nICsgY2xvc2luZ0RlbGltaXRlci5sZW5ndGgpXG59XG5cbi8qKlxuICogVGhlIHJlcG9zaXRvcnkgZmlsZSBvbmUgaW1hZ2UgcmVmZXJlbmNlIHJlc29sdmVzIHRvLCBvciBgdW5kZWZpbmVkYCB3aGVuIHRoZVxuICogdGFyZ2V0IGlzIG5vdCBhIGxvY2FsIGZpbGUgdGhpcyBidWlsZCBtYXkgcHVibGlzaC5cbiAqIEBwYXJhbSBhYnNQYXRoIC0gcmVzb2x2ZWQgaW1hZ2UgdGFyZ2V0LlxuICogQHBhcmFtIHJlcG9Sb290IC0gcmVwb3NpdG9yeSByb290IGV2ZXJ5IHB1Ymxpc2hlZCBpbWFnZSBtdXN0IHN0YXkgaW5zaWRlLlxuICogQHJldHVybnMgdGhlIGZpbGUncyByZWFsIHBhdGgsIG9yIGB1bmRlZmluZWRgIHdoZW4gaXQgbXVzdCBub3QgYmUgY29waWVkLlxuICpcbiAqIE9ubHkgYSByZWd1bGFyIGZpbGUgd2hvc2UgcmVhbCBwYXRoIHN0YXlzIGluc2lkZSB0aGUgcmVwb3NpdG9yeSBxdWFsaWZpZXMuXG4gKiBQdWJsaWNhdGlvbiBjb3BpZXMgdGhlIGJ5dGVzIGludG8gdGhlIHNpdGUsIHNvIGEgcmVmZXJlbmNlIGVzY2FwaW5nIHRoZVxuICogcmVwb3NpdG9yeSBcdTIwMTQgYC4uLy4uLy5zc2gvaWRfcnNhYCwgb3IgYSBzeW1saW5rIHBvaW50aW5nIG91dCBvZiB0aGUgdHJlZSBcdTIwMTRcbiAqIHdvdWxkIHB1dCBhIGJ1aWxkLW1hY2hpbmUgZmlsZSBvbiB0aGUgc2l0ZTsgYGV4aXN0c1N5bmNgIGFsb25lLCB3aGljaCBpcyBhbGxcbiAqIGxpbmsgcmVzb2x1dGlvbiBuZWVkcywgZG9lcyBub3QgYW5zd2VyIHRoYXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwdWJsaXNoYWJsZUltYWdlKGFic1BhdGg6IHN0cmluZywgcmVwb1Jvb3Q6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJlYWwgPSByZWFscGF0aFN5bmMoYWJzUGF0aClcbiAgY29uc3QgaW5zaWRlID0gcmVhbCA9PT0gcmVwb1Jvb3QgfHwgcmVhbC5zdGFydHNXaXRoKGAke3JlcG9Sb290fSR7c2VwfWApXG4gIHJldHVybiBpbnNpZGUgJiYgc3RhdFN5bmMocmVhbCkuaXNGaWxlKCkgPyByZWFsIDogdW5kZWZpbmVkXG59XG5cbi8qKiBFdmVyeSBsb2NhbCBpbWFnZSBhIHB1Ymxpc2hlZCBwYWdlIHJlZmVyZW5jZXMsIHJlc29sdmVkIHRvIGl0cyByZXBvc2l0b3J5IGZpbGUuICovXG5mdW5jdGlvbiByZWZlcmVuY2VkSW1hZ2VzKCk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZm91bmQgPSBuZXcgU2V0PHN0cmluZz4oKVxuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgZG9jc1BhZ2VzKSB7XG4gICAgY29uc3Qgc291cmNlQWJzID0gcmVzb2x2ZShyb290LCBwYWdlLnNvdXJjZSlcbiAgICBpZiAoIWV4aXN0c1N5bmMoc291cmNlQWJzKSkgY29udGludWVcbiAgICByZXdyaXRlTWFya2Rvd24ocmVhZEZpbGVTeW5jKHNvdXJjZUFicywgJ3V0ZjgnKSwge1xuICAgICAgc291cmNlUGF0aDogcGFnZS5zb3VyY2UsXG4gICAgICBsb2NhbGU6IHBhZ2UubG9jYWxlLFxuICAgICAgcm91dGU6IHBhZ2Uucm91dGUsXG4gICAgICBwYWdlczogZG9jc1BhZ2VzLFxuICAgICAgcmVwb1Jvb3Q6IHJvb3QsXG4gICAgICByZXBvc2l0b3J5UmVmOiAnbWFzdGVyJyxcbiAgICAgIHBsYWNlSW1hZ2U6IChhYnNQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWwgPSBwdWJsaXNoYWJsZUltYWdlKGFic1BhdGgsIHJvb3QpXG4gICAgICAgIGlmIChyZWFsICE9PSB1bmRlZmluZWQpIGZvdW5kLmFkZChyZWFsKVxuICAgICAgICByZXR1cm4gJydcbiAgICAgIH0sXG4gICAgfSlcbiAgfVxuICByZXR1cm4gWy4uLmZvdW5kXVxufVxuXG4vKipcbiAqIEZpbGVzIHdhdGNoZWQgYnkgdGhlIGxvY2FsIFZpdGVQcmVzcyBkZXYgc2VydmVyOiBldmVyeSBjYW5vbmljYWwgTWFya2Rvd25cbiAqIHNvdXJjZSwgcGx1cyB0aGUgaW1hZ2VzIHRoZXkgcHVibGlzaC4gV2l0aG91dCB0aGUgaW1hZ2VzLCByZXBsYWNpbmcgYVxuICogc2NyZWVuc2hvdCBsZWF2ZXMgdGhlIHByZXZpb3VzIGNvcHkgaW4gdGhlIGdlbmVyYXRlZCB0cmVlIHVudGlsIHNvbWV0aGluZ1xuICogdG91Y2hlcyB0aGUgTWFya2Rvd24gYmVzaWRlIGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZG9jc1NvdXJjZUZpbGVzKCk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KFsuLi5kb2NzUGFnZXMubWFwKHBhZ2UgPT4gcmVzb2x2ZShyb290LCBwYWdlLnNvdXJjZSkpLCAuLi5yZWZlcmVuY2VkSW1hZ2VzKCldKV1cbn1cblxuLyoqIE1hbmlmZXN0IGFuZCByZXBvc2l0b3J5IGlucHV0cyBmb3Igb25lIHByb2plY3Rpb24gcGFzcy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdGlvbkNvbnRleHQge1xuICAvKiogUGFnZXMgdG8gcHJvamVjdC4gKi9cbiAgcGFnZXM6IERvY3NQYWdlW11cbiAgLyoqIFJlcG9zaXRvcnkgcm9vdCBldmVyeSBzb3VyY2UgYW5kIHBsYWNlZCBpbWFnZSBtdXN0IGxpdmUgdW5kZXIuICovXG4gIHJlcG9Sb290OiBzdHJpbmdcbiAgLyoqIFB1YmxpYyByZWYgdXNlZCBieSBwcm9qZWN0ZWQgR2l0SHViIGxpbmtzLiAqL1xuICByZXBvc2l0b3J5UmVmOiBzdHJpbmdcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFByb2plY3Rpb25Db250ZXh0KCk6IFByb2plY3Rpb25Db250ZXh0IHtcbiAgcmV0dXJuIHsgcGFnZXM6IGRvY3NQYWdlcywgcmVwb1Jvb3Q6IHJvb3QsIHJlcG9zaXRvcnlSZWY6IHJlc29sdmVSZXBvc2l0b3J5UmVmKHByb2Nlc3MuZW52KSB9XG59XG5cbi8qKlxuICogUHJvamVjdCBldmVyeSBwYWdlIGFuZCBpdHMgaW1hZ2VzIGludG8gb25lIHRhcmdldCB0cmVlLlxuICpcbiAqIGBlbnRyaWVzYCBhcmUgd2hhdCBnZXRzIGVtaXR0ZWQ7IGxpbmsgcmVzb2x1dGlvbiBhbHdheXMgcmVhZHMgdGhlIGNhbm9uaWNhbFxuICogYGNvbnRleHQucGFnZXNgLCBzbyBhbiBhbGlhcyBlbnRyeSBzaGFyaW5nIGEgc291cmNlIHdpdGggaXRzIGluZGV4IHJvdXRlXG4gKiBlbWl0cyBhdCBpdHMgb3duIHBhdGggd2hpbGUgbGlua3Mga2VlcCB0YXJnZXRpbmcgY2Fub25pY2FsIHJvdXRlcy5cbiAqL1xuZnVuY3Rpb24gcHJvamVjdFBhZ2VzSW50byhcbiAgdGFyZ2V0Um9vdDogc3RyaW5nLFxuICBjb250ZXh0OiBQcm9qZWN0aW9uQ29udGV4dCxcbiAgcGFnZUNvbnRlbnQ6IChtYXJrZG93bjogc3RyaW5nLCBwYWdlOiBEb2NzUGFnZSkgPT4gc3RyaW5nLFxuICBlbnRyaWVzOiBEb2NzUGFnZVtdID0gY29udGV4dC5wYWdlcyxcbik6IHZvaWQge1xuICBjb25zdCByb3V0ZXMgPSBuZXcgU2V0PHN0cmluZz4oKVxuICAvKiogUHJvamVjdGVkIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgZmlsZSB0aGF0IGNsYWltZWQgaXQsIHBhZ2VzIGFuZCBpbWFnZXMgYWxpa2UuICovXG4gIGNvbnN0IGNsYWltZWQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cbiAgLyoqIFJlc2VydmUgb25lIHByb2plY3RlZCBwYXRoLCByZWZ1c2luZyBhIHNlY29uZCBzb3VyY2UgZm9yIGl0LiAqL1xuICBjb25zdCBjbGFpbSA9ICh0YXJnZXQ6IHN0cmluZywgc291cmNlQWJzOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICBjb25zdCBob2xkZXIgPSBjbGFpbWVkLmdldCh0YXJnZXQpXG4gICAgaWYgKGhvbGRlciAhPT0gdW5kZWZpbmVkICYmIGhvbGRlciAhPT0gc291cmNlQWJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBwcm9qZWN0LWRvYy1zaXRlOiAke3JlcG9QYXRoKHNvdXJjZUFicywgY29udGV4dC5yZXBvUm9vdCl9IGFuZCAke3JlcG9QYXRoKGhvbGRlciwgY29udGV4dC5yZXBvUm9vdCl9YFxuICAgICAgICArIGAgYm90aCBwcm9qZWN0IHRvICR7cmVsYXRpdmUodGFyZ2V0Um9vdCwgdGFyZ2V0KS5zcGxpdChzZXApLmpvaW4oJy8nKX0uYCxcbiAgICAgIClcbiAgICB9XG4gICAgLy8gQSBmaWxlIHRoZSBwcm9qZWN0aW9uIGRpZCBub3QgY2xhaW0gaXMgYW5vdGhlciBwcm9kdWNlcidzIG91dHB1dCBcdTIwMTQgaW5cbiAgICAvLyB0aGUgdHdpbiBwYXNzLCB0aGUgYnVpbGQgVml0ZVByZXNzIGp1c3Qgd3JvdGUsIGluY2x1ZGluZyBgcHVibGljL2BcbiAgICAvLyBjb3BpZXMuIE92ZXJ3cml0aW5nIG9uZSB3b3VsZCBzaWxlbnRseSBjb3JydXB0IHRoZSBzaXRlLlxuICAgIGlmIChob2xkZXIgPT09IHVuZGVmaW5lZCAmJiBleGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYHByb2plY3QtZG9jLXNpdGU6ICR7cmVwb1BhdGgoc291cmNlQWJzLCBjb250ZXh0LnJlcG9Sb290KX0gd291bGQgb3ZlcndyaXRlIGV4aXN0aW5nIGJ1aWxkIGZpbGVgXG4gICAgICAgICsgYCAke3JlbGF0aXZlKHRhcmdldFJvb3QsIHRhcmdldCkuc3BsaXQoc2VwKS5qb2luKCcvJyl9LmAsXG4gICAgICApXG4gICAgfVxuICAgIGNsYWltZWQuc2V0KHRhcmdldCwgc291cmNlQWJzKVxuICB9XG5cbiAgZm9yIChjb25zdCBwYWdlIG9mIGVudHJpZXMpIHtcbiAgICBpZiAocm91dGVzLmhhcyhwYWdlLnJvdXRlKSkgdGhyb3cgbmV3IEVycm9yKGBwcm9qZWN0LWRvYy1zaXRlOiBkdXBsaWNhdGUgcm91dGUgJHtKU09OLnN0cmluZ2lmeShwYWdlLnJvdXRlKX0uYClcbiAgICByb3V0ZXMuYWRkKHBhZ2Uucm91dGUpXG4gICAgY29uc3Qgc291cmNlQWJzID0gcmVzb2x2ZShjb250ZXh0LnJlcG9Sb290LCBwYWdlLnNvdXJjZSlcbiAgICBpZiAoIWV4aXN0c1N5bmMoc291cmNlQWJzKSB8fCAhbHN0YXRTeW5jKHNvdXJjZUFicykuaXNGaWxlKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcHJvamVjdC1kb2Mtc2l0ZTogc291cmNlICR7SlNPTi5zdHJpbmdpZnkocGFnZS5zb3VyY2UpfSBkb2VzIG5vdCBleGlzdCBvciBpcyBub3QgYSBmaWxlLmApXG4gICAgfVxuICAgIGNvbnN0IG91dHB1dCA9IHJlc29sdmUodGFyZ2V0Um9vdCwgcGFnZS5yb3V0ZSlcbiAgICAvLyBDbGFpbWVkIGJlZm9yZSB0aGUgaW1hZ2VzIGFyZSBwbGFjZWQ6IGEgcGFnZSBhbmQgYW4gaW1hZ2UgbGFuZGluZyBvbiBvbmVcbiAgICAvLyBwYXRoIHdvdWxkIG90aGVyd2lzZSBvdmVyd3JpdGUgZWFjaCBvdGhlciBpbiB3aGljaGV2ZXIgb3JkZXIgdGhleSByYW4uXG4gICAgY2xhaW0ob3V0cHV0LCBzb3VyY2VBYnMpXG4gICAgbWtkaXJTeW5jKGRpcm5hbWUob3V0cHV0KSwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICBjb25zdCBtYXJrZG93biA9IHJlYWRGaWxlU3luYyhzb3VyY2VBYnMsICd1dGY4JylcbiAgICBjb25zdCBwcm9qZWN0ZWQgPSByZXdyaXRlTWFya2Rvd24obWFya2Rvd24sIHtcbiAgICAgIHNvdXJjZVBhdGg6IHBhZ2Uuc291cmNlLFxuICAgICAgbG9jYWxlOiBwYWdlLmxvY2FsZSxcbiAgICAgIHJvdXRlOiBwYWdlLnJvdXRlLFxuICAgICAgcGFnZXM6IGNvbnRleHQucGFnZXMsXG4gICAgICByZXBvUm9vdDogY29udGV4dC5yZXBvUm9vdCxcbiAgICAgIHJlcG9zaXRvcnlSZWY6IGNvbnRleHQucmVwb3NpdG9yeVJlZixcbiAgICAgIHBsYWNlSW1hZ2U6IChhYnNQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWwgPSBwdWJsaXNoYWJsZUltYWdlKGFic1BhdGgsIGNvbnRleHQucmVwb1Jvb3QpXG4gICAgICAgIGlmIChyZWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgcHJvamVjdC1kb2Mtc2l0ZTogJHtwYWdlLnNvdXJjZX0gcmVmZXJlbmNlcyBpbWFnZSAke3JlcG9QYXRoKGFic1BhdGgsIGNvbnRleHQucmVwb1Jvb3QpfSxgXG4gICAgICAgICAgICArICcgd2hpY2ggaXMgbm90IGEgcmVndWxhciBmaWxlIGluc2lkZSB0aGUgcmVwb3NpdG9yeS4nLFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICAvLyBCZXNpZGUgdGhlIHBhZ2UgdGhhdCByZWZlcmVuY2VzIGl0LCB1bmRlciBpdHMgb3duIGJhc2VuYW1lOiBlYWNoXG4gICAgICAgIC8vIGxvY2FsZSdzIHJvdXRlIHRyZWUgZ2V0cyBpdHMgb3duIGNvcHksIHNvIG9uZSByZWxhdGl2ZSBVUkwgaXMgY29ycmVjdFxuICAgICAgICAvLyBmcm9tIGJvdGguXG4gICAgICAgIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShyZWFsKVxuICAgICAgICBjb25zdCB0YXJnZXQgPSByZXNvbHZlKGRpcm5hbWUob3V0cHV0KSwgbmFtZSlcbiAgICAgICAgY2xhaW0odGFyZ2V0LCByZWFsKVxuICAgICAgICBjb3B5RmlsZVN5bmMocmVhbCwgdGFyZ2V0KVxuICAgICAgICAvLyBFbmNvZGVkIGJlY2F1c2UgdGhlIGRlc3RpbmF0aW9uIGlzIGEgTWFya2Rvd24gaW5saW5lIHRhcmdldCwgd2hlcmUgYW5cbiAgICAgICAgLy8gdW5lc2NhcGVkIHNwYWNlIHdvdWxkIGVuZCBpdCBlYXJseS5cbiAgICAgICAgcmV0dXJuIGAuLyR7ZW5jb2RlVVJJKG5hbWUpfWBcbiAgICAgIH0sXG4gICAgfSlcbiAgICB3cml0ZUZpbGVTeW5jKG91dHB1dCwgcGFnZUNvbnRlbnQocHJvamVjdGVkLCBwYWdlKSlcbiAgfVxufVxuXG4vKiogUmVidWlsZCB0aGUgZGlzcG9zYWJsZSBWaXRlUHJlc3Mgc291cmNlIHRyZWUgZnJvbSB0aGUgcHVibGljYXRpb24gbWFuaWZlc3QuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvamVjdERvY3MoKTogdm9pZCB7XG4gIHJtU3luYyhnZW5lcmF0ZWRSb290LCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSlcbiAgcHJvamVjdFBhZ2VzSW50byhnZW5lcmF0ZWRSb290LCBkZWZhdWx0UHJvamVjdGlvbkNvbnRleHQoKSwgKG1hcmtkb3duLCBwYWdlKSA9PlxuICAgIGFkZFByb2plY3Rpb25Gcm9udG1hdHRlcihwcm9qZWN0ZWRQYWdlQ29udGVudChtYXJrZG93biwgcGFnZSksIHBhZ2UpKVxufVxuXG4vKipcbiAqIFN0cmlwIHRoZSBsZWFkaW5nIFlBTUwgZnJvbnRtYXR0ZXIgb2YgYSBwcm9qZWN0ZWQgcGFnZS5cbiAqXG4gKiBAcGFyYW0gbWFya2Rvd24gUmV3cml0dGVuIGNhbm9uaWNhbCBNYXJrZG93biBjb250ZW50LlxuICogQHBhcmFtIHNvdXJjZSBSZXBvc2l0b3J5LXJlbGF0aXZlIHBhZ2Ugc291cmNlLCBuYW1lZCBieSB0aGUgZmFpbHVyZS5cbiAqIEByZXR1cm5zIFRoZSBjb250ZW50IGFmdGVyIHRoZSBmcm9udG1hdHRlciBibG9jaywgb3IgdGhlIGlucHV0IHdoZW4gbm9uZSBvcGVucyBpdC5cbiAqL1xuZnVuY3Rpb24gd2l0aG91dEZyb250bWF0dGVyKG1hcmtkb3duOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFtYXJrZG93bi5zdGFydHNXaXRoKCctLS1cXG4nKSkgcmV0dXJuIG1hcmtkb3duXG4gIGNvbnN0IGNsb3NpbmdEZWxpbWl0ZXIgPSAnXFxuLS0tXFxuJ1xuICBjb25zdCBjbG9zaW5nID0gbWFya2Rvd24uaW5kZXhPZihjbG9zaW5nRGVsaW1pdGVyLCA0KVxuICBpZiAoY2xvc2luZyA9PT0gLTEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHByb2plY3QtZG9jLXNpdGU6ICR7SlNPTi5zdHJpbmdpZnkoc291cmNlKX0gaGFzIHVuY2xvc2VkIFlBTUwgZnJvbnRtYXR0ZXIuYClcbiAgfVxuICByZXR1cm4gbWFya2Rvd24uc2xpY2UoY2xvc2luZyArIGNsb3NpbmdEZWxpbWl0ZXIubGVuZ3RoKS5yZXBsYWNlKC9eXFxuKy8sICcnKVxufVxuXG4vKipcbiAqIFRoZSByYXctTWFya2Rvd24gdHdpbiBvZiBvbmUgcHVibGlzaGVkIHBhZ2UuXG4gKlxuICogRnJvbnRtYXR0ZXIgaXMgVml0ZVByZXNzIHJlbmRlcmluZyBjb25maWd1cmF0aW9uIGFuZCBpcyBkcm9wcGVkLiBBIGxvY2FsZVxuICogaG9tZSBwYWdlIHRoZXJlZm9yZSBrZWVwcyBpdHMgYm9keSBoZXJlLCB3aGlsZSB0aGUgcmVuZGVyZWQgc2l0ZSB0cnVuY2F0ZXNcbiAqIGl0IHRvIHRoZSBmcm9udG1hdHRlciByZWRpcmVjdC5cbiAqXG4gKiBAcGFyYW0gbWFya2Rvd24gUmV3cml0dGVuIGNhbm9uaWNhbCBNYXJrZG93biBjb250ZW50LlxuICogQHBhcmFtIHNvdXJjZSBSZXBvc2l0b3J5LXJlbGF0aXZlIHBhZ2Ugc291cmNlLCBuYW1lZCBieSBmcm9udG1hdHRlciBmYWlsdXJlcy5cbiAqIEByZXR1cm5zIFBsYWluIE1hcmtkb3duIHdpdGhvdXQgZnJvbnRtYXR0ZXIgb3IgcmVwb3NpdG9yeSBjaHJvbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYXdNYXJrZG93blBhZ2VDb250ZW50KG1hcmtkb3duOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHdpdGhvdXRSZXBvc2l0b3J5Q2hyb21lKHdpdGhvdXRGcm9udG1hdHRlcihtYXJrZG93biwgc291cmNlKSlcbn1cblxuLyoqXG4gKiBQYXJlbnQtbGV2ZWwgYWxpYXMgcm91dGUgb2YgYW4gaW5kZXggcm91dGUsIG9yIGB1bmRlZmluZWRgIGZvciBvdGhlciByb3V0ZXMuXG4gKlxuICogVGhlIHJlbmRlcmVkIHNpdGUgc2hvd3MgYW4gaW5kZXggcm91dGUgYXMgYSBkaXJlY3RvcnkgVVJMLCBzbyBcImFwcGVuZFxuICogYC5tZGBcIiBuYXR1cmFsbHkgbGFuZHMgb24gYDxkaXI+Lm1kYCBvbmNlIHRoZSB0cmFpbGluZyBzbGFzaCBpcyBkcm9wcGVkLlxuICogVGhlIHJvb3QgYGluZGV4Lm1kYCBoYXMgbm8gcGFyZW50IHRvIGFsaWFzIGludG8uXG4gKi9cbmZ1bmN0aW9uIGluZGV4QWxpYXNSb3V0ZShyb3V0ZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWF0Y2ggPSAvXiguKylcXC9pbmRleFxcLm1kJC8uZXhlYyhyb3V0ZSlcbiAgcmV0dXJuIG1hdGNoPy5bMV0gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGAke21hdGNoWzFdfS5tZGBcbn1cblxuLyoqXG4gKiBTaXRlLXJlbGF0aXZlIE1hcmtkb3duIGZpbGVzIHRoZSByYXctTWFya2Rvd24gcHJvamVjdGlvbiBlbWl0czogZXZlcnlcbiAqIHJvdXRlLCBwbHVzIG9uZSBwYXJlbnQtbGV2ZWwgYWxpYXMgcGVyIGluZGV4IHJvdXRlLlxuICpcbiAqIEBwYXJhbSBwYWdlcyBQYWdlcyB0byBwcm9qZWN0LCBkZWZhdWx0aW5nIHRvIHRoZSBwdWJsaWNhdGlvbiBtYW5pZmVzdC5cbiAqIEByZXR1cm5zIFRoZSBlbWl0dGVkIHBhdGhzLCByb3V0ZXMgZmlyc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYXdNYXJrZG93bkZpbGVzKHBhZ2VzOiBEb2NzUGFnZVtdID0gZG9jc1BhZ2VzKTogc3RyaW5nW10ge1xuICBjb25zdCBhbGlhc2VzID0gcGFnZXMubWFwKHBhZ2UgPT4gaW5kZXhBbGlhc1JvdXRlKHBhZ2Uucm91dGUpKS5maWx0ZXIoYWxpYXMgPT4gYWxpYXMgIT09IHVuZGVmaW5lZClcbiAgcmV0dXJuIFsuLi5wYWdlcy5tYXAocGFnZSA9PiBwYWdlLnJvdXRlKSwgLi4uYWxpYXNlc11cbn1cblxuLyoqXG4gKiBFbWl0IHRoZSByYXctTWFya2Rvd24gdHdpbiBvZiBldmVyeSBwdWJsaXNoZWQgcm91dGUgaW50byBhIGJ1aWx0IHNpdGUsIHNvXG4gKiBzdGF0aWMgaG9zdGluZyBzZXJ2ZXMgdGhlIHBhZ2UncyBVUkwsIG1pbnVzIGFueSB0cmFpbGluZyBzbGFzaCwgcGx1cyBgLm1kYFxuICogYXMgcGxhaW4gTWFya2Rvd24uIEVhY2ggaW5kZXggcm91dGUgYWxzbyBlbWl0cyBhIHBhcmVudC1sZXZlbCBhbGlhcyB0d2luLFxuICogcHJvamVjdGVkIG92ZXIgdGhlIGFsaWFzIHJvdXRlIHNvIGl0cyByZWxhdGl2ZSBsaW5rcyBzdGF5IGNvcnJlY3QuXG4gKiBSZWZlcmVuY2VkIGltYWdlcyBhcmUgY29waWVkIGJlc2lkZSB0aGUgcGFnZXMsIGtlZXBpbmcgdGhlIHNhbWUgcmVsYXRpdmVcbiAqIFVSTHMgdmFsaWQgaW4gYm90aCB0cmVlcy4gRXhpc3RpbmcgYnVpbGQgZmlsZXMgc3RheSBpbiBwbGFjZSwgYW5kIGEgbmFtZVxuICogY29sbGlzaW9uIHdpdGggb25lIGZhaWxzIHRoZSBlbWlzc2lvbi4gTWFya2Rvd24gZmlsZXMgY2FycnkgYSBVVEYtOCBCT00gc29cbiAqIGJyb3dzZXIgbmF2aWdhdGlvbiBkZWNvZGVzIHRoZW0gZXZlbiB3aGVuIHN0YXRpYyBob3N0aW5nIG9taXRzIGEgY2hhcnNldC5cbiAqXG4gKiBAcGFyYW0gb3V0RGlyIEJ1aWxkIG91dHB1dCBkaXJlY3RvcnkgdG8gZW1pdCBpbnRvLlxuICogQHBhcmFtIGNvbnRleHQgTWFuaWZlc3QgYW5kIHJlcG9zaXRvcnkgaW5wdXRzLCBkZWZhdWx0aW5nIHRvIHRoaXMgcmVwb3NpdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtaXRSYXdNYXJrZG93blBhZ2VzKG91dERpcjogc3RyaW5nLCBjb250ZXh0OiBQcm9qZWN0aW9uQ29udGV4dCA9IGRlZmF1bHRQcm9qZWN0aW9uQ29udGV4dCgpKTogdm9pZCB7XG4gIGNvbnN0IGFsaWFzZXMgPSBjb250ZXh0LnBhZ2VzLmZsYXRNYXAoKHBhZ2UpID0+IHtcbiAgICBjb25zdCBhbGlhcyA9IGluZGV4QWxpYXNSb3V0ZShwYWdlLnJvdXRlKVxuICAgIHJldHVybiBhbGlhcyA9PT0gdW5kZWZpbmVkID8gW10gOiBbeyAuLi5wYWdlLCByb3V0ZTogYWxpYXMgfV1cbiAgfSlcbiAgcHJvamVjdFBhZ2VzSW50byhcbiAgICBvdXREaXIsXG4gICAgY29udGV4dCxcbiAgICAobWFya2Rvd24sIHBhZ2UpID0+IGBcXHVGRUZGJHtyYXdNYXJrZG93blBhZ2VDb250ZW50KG1hcmtkb3duLCBwYWdlLnNvdXJjZSl9YCxcbiAgICBbLi4uY29udGV4dC5wYWdlcywgLi4uYWxpYXNlc10sXG4gIClcbn1cblxuLyoqXG4gKiBSYXcgTWFya2Rvd24gc2VydmVkIGZvciBvbmUgc2l0ZSByb3V0ZS5cbiAqXG4gKiBEZXYtc2VydmVyIGNvdW50ZXJwYXJ0IG9mIHtAbGluayBlbWl0UmF3TWFya2Rvd25QYWdlc306IGltYWdlcyBhcmUgbm90XG4gKiBjb3BpZWQgYmVjYXVzZSB0aGUgZ2VuZXJhdGVkIHRyZWUgYWxyZWFkeSBzZXJ2ZXMgdGhlbSBiZXNpZGUgdGhlIHBhZ2UuXG4gKlxuICogQHBhcmFtIHJvdXRlIE1hbmlmZXN0IHJvdXRlLCBpbmNsdWRpbmcgaXRzIGAubWRgIHN1ZmZpeC5cbiAqIEBwYXJhbSBjb250ZXh0IE1hbmlmZXN0IGFuZCByZXBvc2l0b3J5IGlucHV0cywgZGVmYXVsdGluZyB0byB0aGlzIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdGVkIHBhZ2UsIG9yIGB1bmRlZmluZWRgIHdoZW4gdGhlIG1hbmlmZXN0IGRvZXMgbm90IHB1Ymxpc2ggdGhlIHJvdXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmF3TWFya2Rvd25Sb3V0ZShyb3V0ZTogc3RyaW5nLCBjb250ZXh0OiBQcm9qZWN0aW9uQ29udGV4dCA9IGRlZmF1bHRQcm9qZWN0aW9uQ29udGV4dCgpKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgcGFnZSA9IGNvbnRleHQucGFnZXMuZmluZChjYW5kaWRhdGUgPT4gY2FuZGlkYXRlLnJvdXRlID09PSByb3V0ZSlcbiAgaWYgKHBhZ2UgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZFxuICBjb25zdCBtYXJrZG93biA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKGNvbnRleHQucmVwb1Jvb3QsIHBhZ2Uuc291cmNlKSwgJ3V0ZjgnKVxuICByZXR1cm4gcmF3TWFya2Rvd25QYWdlQ29udGVudChyZXdyaXRlTWFya2Rvd24obWFya2Rvd24sIHtcbiAgICBzb3VyY2VQYXRoOiBwYWdlLnNvdXJjZSxcbiAgICBsb2NhbGU6IHBhZ2UubG9jYWxlLFxuICAgIHJvdXRlOiBwYWdlLnJvdXRlLFxuICAgIHBhZ2VzOiBjb250ZXh0LnBhZ2VzLFxuICAgIHJlcG9Sb290OiBjb250ZXh0LnJlcG9Sb290LFxuICAgIHJlcG9zaXRvcnlSZWY6IGNvbnRleHQucmVwb3NpdG9yeVJlZixcbiAgICBwbGFjZUltYWdlOiBhYnNQYXRoID0+IGAuLyR7ZW5jb2RlVVJJKGJhc2VuYW1lKGFic1BhdGgpKX1gLFxuICB9KSwgcGFnZS5zb3VyY2UpXG59XG5cbi8qKiBTaXRlIGlkZW50aXR5IHdyaXR0ZW4gaW50byBsbG1zLnR4dC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGxtc1R4dFNpdGUge1xuICAvKiogU2l0ZSBiYXNlIHBhdGgsIGNhcnJ5aW5nIHRoZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIFZpdGVQcmVzcyByZXF1aXJlcy4gKi9cbiAgYmFzZTogc3RyaW5nXG4gIC8qKiBTaXRlIHRpdGxlLiAqL1xuICB0aXRsZTogc3RyaW5nXG4gIC8qKiBTaXRlIGRlc2NyaXB0aW9uLiAqL1xuICBkZXNjcmlwdGlvbjogc3RyaW5nXG59XG5cbi8qKiBMb2NhbGUgZ3JvdXBzIGxsbXMudHh0IGxpc3RzLCBpbiB0aGUgb3JkZXIgdGhlIHNpdGUncyBuYXZpZ2F0aW9uIHByZXNlbnRzIHRoZW0uICovXG5jb25zdCBsbG1zVHh0TG9jYWxlczogcmVhZG9ubHkgeyBoZWFkaW5nOiBzdHJpbmc7IGxvY2FsZTogRG9jc0xvY2FsZSB9W10gPSBbXG4gIHsgaGVhZGluZzogJ1x1N0I4MFx1NEY1M1x1NEUyRFx1NjU4NycsIGxvY2FsZTogJ3Jvb3QnIH0sXG4gIHsgaGVhZGluZzogJ0VuZ2xpc2gnLCBsb2NhbGU6ICdlbicgfSxcbl1cblxuLyoqXG4gKiBUaGUgbGxtcy50eHQgaW5kZXggb2YgZXZlcnkgcHVibGlzaGVkIHBhZ2UncyByYXctTWFya2Rvd24gdHdpbi5cbiAqXG4gKiBMaW5rcyBhcmUgc2l0ZS1hYnNvbHV0ZSBzbyBhbiBhZ2VudCByZXNvbHZlcyB0aGVtIGFnYWluc3QgdGhlIGhvc3QgaXRcbiAqIGZldGNoZWQgbGxtcy50eHQgZnJvbTsgbG9jYWxlIGhvbWUgcGFnZXMgc3RheSBvdXQgYmVjYXVzZSB0aGlzIGZpbGUgaXMgdGhlXG4gKiBhZ2VudC1mYWNpbmcgZW50cnkgcG9pbnQgaXRzZWxmLlxuICpcbiAqIEBwYXJhbSBzaXRlIFNpdGUgaWRlbnRpdHkgYW5kIGJhc2UgcGF0aC5cbiAqIEByZXR1cm5zIGxsbXMudHh0IGNvbnRlbnQgbGlzdGluZyBib3RoIGxvY2FsZSB0cmVlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxsbXNUeHQoc2l0ZTogTGxtc1R4dFNpdGUpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IFtcbiAgICBgIyAke3NpdGUudGl0bGV9YCxcbiAgICAnJyxcbiAgICBgPiAke3NpdGUuZGVzY3JpcHRpb259YCxcbiAgICAnJyxcbiAgICAnXHU5ODc1XHU5NzYyIFVSTCBcdTUzQkJcdTYzODlcdTY3MkJcdTVDM0VcdTY1OUNcdTY3NjBcdTUxOERcdTUyQTAgYC5tZGAgXHU1MzczXHU0RTNBXHU4QkU1XHU5ODc1XHU1MzlGXHU1OUNCIE1hcmtkb3duKFx1NjgzOVx1OERFRlx1NUY4NFx1NzUyOCBgL2luZGV4Lm1kYCk7XHU0RTBCXHU2NUI5XHU1MjE3XHU4ODY4XHU2NjJGXHU1NDA0XHU5ODc1XHU3Q0JFXHU3ODZFXHU1NzMwXHU1NzQwXHUzMDAyRHJvcCBhbnkgdHJhaWxpbmcgc2xhc2ggYW5kIGFwcGVuZCBgLm1kYCB0byBhIHBhZ2UgVVJMIGZvciBpdHMgcmF3IE1hcmtkb3duICh0aGUgc2l0ZSByb290IGlzIGAvaW5kZXgubWRgKTsgdGhlIGxpc3QgYmVsb3cgY2FycmllcyB0aGUgZXhhY3QgYWRkcmVzc2VzLicsXG4gIF1cbiAgZm9yIChjb25zdCB7IGhlYWRpbmcsIGxvY2FsZSB9IG9mIGxsbXNUeHRMb2NhbGVzKSB7XG4gICAgbGluZXMucHVzaCgnJywgYCMjICR7aGVhZGluZ31gLCAnJylcbiAgICBmb3IgKGNvbnN0IGNvbGxlY3Rpb24gb2YgbG9jYWxlQ29sbGVjdGlvbnNbbG9jYWxlXSkge1xuICAgICAgZm9yIChjb25zdCBwYWdlIG9mIG9yZGVyZWRQYWdlcyhsb2NhbGUsIGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIGxpbmVzLnB1c2goYC0gWyR7cGFnZS5sYWJlbH1dKCR7c2l0ZS5iYXNlfSR7cGFnZS5yb3V0ZX0pOiAke3BhZ2Uuc2VjdGlvbn1gKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYCR7bGluZXMuam9pbignXFxuJyl9XFxuYFxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxcdTY1QjBcdTUyMUJcdTYxMEZcdTY3ODRcdTYwMURcXFxcQ2x1c3Rlci1Db29wZXJhdGlvblxcXFxkZWVwc2Vlay1oYXJuZXNzXFxcXHNjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFx1NjVCMFx1NTIxQlx1NjEwRlx1Njc4NFx1NjAxRFxcXFxDbHVzdGVyLUNvb3BlcmF0aW9uXFxcXGRlZXBzZWVrLWhhcm5lc3NcXFxcc2NyaXB0c1xcXFxtYXJrZG93bi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovJUU2JTk2JUIwJUU1JTg4JTlCJUU2JTg0JThGJUU2JTlFJTg0JUU2JTgwJTlEL0NsdXN0ZXItQ29vcGVyYXRpb24vZGVlcHNlZWstaGFybmVzcy9zY3JpcHRzL21hcmtkb3duLnRzXCI7LyoqIFNoYXJlZCBNYXJrZG93biBwYXJzaW5nIGFuZCBkZXB0aC1maXJzdCB0cmF2ZXJzYWwgZm9yIGRvY3VtZW50YXRpb24gZ2F0ZXMuICovXG5cbmltcG9ydCB7IGZyb21NYXJrZG93biB9IGZyb20gJ21kYXN0LXV0aWwtZnJvbS1tYXJrZG93bidcbmltcG9ydCB7IGdmbUZyb21NYXJrZG93biB9IGZyb20gJ21kYXN0LXV0aWwtZ2ZtJ1xuaW1wb3J0IHsgZ2ZtIH0gZnJvbSAnbWljcm9tYXJrLWV4dGVuc2lvbi1nZm0nXG5pbXBvcnQgdHlwZSB7IE5vZGVzIH0gZnJvbSAnbWRhc3QnXG5cbi8qKiBPbmUgYXV0aG9yZWQgTWFya2Rvd24gbGluZSBvdXRzaWRlIGZlbmNlZCBjb2RlIGFuZCByZW5kZXJlZC1hd2F5IEhUTUwgY29tbWVudHMuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcmtkb3duUHJvc2VMaW5lIHtcbiAgLyoqIDEtYmFzZWQgc291cmNlIGxpbmUgbnVtYmVyLiAqL1xuICBpbmRleDogbnVtYmVyXG4gIC8qKiBTb3VyY2UgdGV4dCB3aXRob3V0IG5vcm1hbGl6YXRpb24uICovXG4gIHJhdzogc3RyaW5nXG59XG5cbi8qKiBPbmUgcGFyc2VkIE1hcmtkb3duIGhlYWRpbmcsIHJldGFpbmluZyBpdHMgYXV0aG9yZWQgZmlyc3QgbGluZSBhbmQgcmVuZGVyZWQgdGV4dC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWFya2Rvd25IZWFkaW5nTGluZSBleHRlbmRzIE1hcmtkb3duUHJvc2VMaW5lIHtcbiAgLyoqIFBhcnNlZCBBVFggb3IgU2V0ZXh0IGhlYWRpbmcgZGVwdGguICovXG4gIGRlcHRoOiAxIHwgMiB8IDMgfCA0IHwgNSB8IDZcbiAgLyoqIFJlbmRlcmVkIGhlYWRpbmcgdGV4dCwgZXhjbHVkaW5nIHJhdyBIVE1MIHN1Y2ggYXMgY29tbWVudHMuICovXG4gIHRleHQ6IHN0cmluZ1xufVxuXG4vKiogT25lIGNvZGUgYmxvY2sgZnJvbSBhIHBhcnNlZCBNYXJrZG93biBzb3VyY2UuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcmtkb3duRmVuY2Uge1xuICAvKiogMS1iYXNlZCBzb3VyY2UgbGluZSBvZiB0aGUgb3BlbmluZyBmZW5jZS4gKi9cbiAgbGluZTogbnVtYmVyXG4gIC8qKiBJbmZvLXN0cmluZyBsYW5ndWFnZSAoaXRzIGZpcnN0IHdvcmQpLCBudWxsIG9uIGEgYmFyZSBvciBpbmRlbnRlZCBibG9jay4gKi9cbiAgbGFuZzogc3RyaW5nIHwgbnVsbFxuICAvKiogRnVsbCBpbmZvIHN0cmluZyAoZS5nLiBgdHMgaWdub3JlLWNoZWNrYCksICcnIG9uIGEgYmFyZSBvciBpbmRlbnRlZCBibG9jay4gKi9cbiAgaW5mbzogc3RyaW5nXG4gIC8qKiBCbG9jayBib2R5IHdpdGhvdXQgdGhlIGZlbmNlIGRlbGltaXRlcnMuICovXG4gIGNvZGU6IHN0cmluZ1xuICAvKipcbiAgICogV2hldGhlciBhIGNsb3NpbmcgZmVuY2UgZGVsaW1pdGVyIHRlcm1pbmF0ZXMgdGhlIGJsb2NrIFx1MjAxNCBtZGFzdCBzaWxlbnRseVxuICAgKiBjbG9zZXMgYW4gdW50ZXJtaW5hdGVkIGZlbmNlIGF0IGVuZCBvZiBmaWxlLiBGYWxzZSBvbiBpbmRlbnRlZFxuICAgKiAobm9uLWZlbmNlZCkgYmxvY2tzLCB3aG9zZSBlbmQgbGluZSBpcyBjb2RlLlxuICAgKi9cbiAgY2xvc2VkOiBib29sZWFuXG59XG5cbi8qKiBQYXJzZSBHaXRIdWItZmxhdm9yZWQgTWFya2Rvd24gd2l0aCB0aGUgcmVwb3NpdG9yeSdzIHN0YW5kYXJkIGV4dGVuc2lvbnMuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNYXJrZG93bihzb3VyY2U6IHN0cmluZyk6IE5vZGVzIHtcbiAgcmV0dXJuIGZyb21NYXJrZG93bihzb3VyY2UsIHsgZXh0ZW5zaW9uczogW2dmbSgpXSwgbWRhc3RFeHRlbnNpb25zOiBbZ2ZtRnJvbU1hcmtkb3duKCldIH0pXG59XG5cbi8qKlxuICogVmlzaXQgYSBNYXJrZG93biB0cmVlIGRlcHRoLWZpcnN0OyByZXR1cm5pbmcgZmFsc2UgcHJ1bmVzIGEgbm9kZSdzIGNoaWxkcmVuLlxuICogQHBhcmFtIG5vZGUgLSBjdXJyZW50IHRyZWUgbm9kZS5cbiAqIEBwYXJhbSB2aXNpdG9yIC0gY2FsbGJhY2sgaW52b2tlZCBiZWZvcmUgZWFjaCBub2RlJ3MgY2hpbGRyZW4uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2aXNpdE1hcmtkb3duKG5vZGU6IE5vZGVzLCB2aXNpdG9yOiAobm9kZTogTm9kZXMpID0+IGJvb2xlYW4gfCB2b2lkKTogdm9pZCB7XG4gIGlmICh2aXNpdG9yKG5vZGUpID09PSBmYWxzZSkgcmV0dXJuXG4gIGlmICgnY2hpbGRyZW4nIGluIG5vZGUpIHtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHZpc2l0TWFya2Rvd24oY2hpbGQsIHZpc2l0b3IpXG4gIH1cbn1cblxuLyoqIE1hcmtkb3duIG5vZGVzIHdob3NlIGF1dGhvcmVkIGRlc3RpbmF0aW9uIG9jY3VwaWVzIGEgcmVwbGFjZWFibGUgc291cmNlIHJhbmdlLiAqL1xuZXhwb3J0IHR5cGUgTWFya2Rvd25EZXN0aW5hdGlvbk5vZGUgPSBFeHRyYWN0PE5vZGVzLCB7IHR5cGU6ICdsaW5rJyB8ICdpbWFnZScgfCAnZGVmaW5pdGlvbicgfT5cblxuLyoqIE9uZSBhdXRob3JlZCBNYXJrZG93biBkZXN0aW5hdGlvbiBhbmQgaXRzIGFic29sdXRlIHNvdXJjZSBvZmZzZXRzLiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXJrZG93bkRlc3RpbmF0aW9uIHtcbiAgc3RhcnQ6IG51bWJlclxuICBlbmQ6IG51bWJlclxuICB1cmw6IHN0cmluZ1xufVxuXG4vKiogV2hldGhlciBhIE1hcmtkb3duIFVSTCBpcyBleHRlcm5hbCwgcmVwb3NpdG9yeS1yb290IGFic29sdXRlLCBvciBwdXJlbHkgaW4tcGFnZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0V4dGVybmFsT3JBYnNvbHV0ZU1hcmtkb3duVXJsKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB1cmwuc3RhcnRzV2l0aCgnIycpXG4gICAgfHwgdXJsLnN0YXJ0c1dpdGgoJy8vJylcbiAgICB8fCB1cmwuc3RhcnRzV2l0aCgnLycpXG4gICAgfHwgL15bYS16QS1aXVthLXpBLVowLTkrLi1dKjovLnRlc3QodXJsKVxufVxuXG4vKiogU3BsaXQgb25lIE1hcmtkb3duIFVSTCB3aXRob3V0IG5vcm1hbGl6aW5nIGl0cyBxdWVyeSBvciBmcmFnbWVudCBzdWZmaXguICovXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRNYXJrZG93blVybFRhcmdldCh1cmw6IHN0cmluZyk6IHsgcGF0aDogc3RyaW5nOyBzdWZmaXg6IHN0cmluZyB9IHtcbiAgY29uc3QgYm91bmRhcnkgPSB1cmwuc2VhcmNoKC9bPyNdLylcbiAgaWYgKGJvdW5kYXJ5ID09PSAtMSkgcmV0dXJuIHsgcGF0aDogdXJsLCBzdWZmaXg6ICcnIH1cbiAgcmV0dXJuIHsgcGF0aDogdXJsLnNsaWNlKDAsIGJvdW5kYXJ5KSwgc3VmZml4OiB1cmwuc2xpY2UoYm91bmRhcnkpIH1cbn1cblxuZnVuY3Rpb24gc2tpcFdoaXRlc3BhY2Uoc291cmNlOiBzdHJpbmcsIHN0YXJ0OiBudW1iZXIpOiBudW1iZXIge1xuICBsZXQgaW5kZXggPSBzdGFydFxuICB3aGlsZSAoL1xccy8udGVzdChzb3VyY2VbaW5kZXhdID8/ICcnKSkgaW5kZXggKz0gMVxuICByZXR1cm4gaW5kZXhcbn1cblxuZnVuY3Rpb24gbGFiZWxFbmQoc291cmNlOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBmaXJzdCA9IHNvdXJjZS5pbmRleE9mKCdbJylcbiAgaWYgKGZpcnN0ID09PSAtMSkgcmV0dXJuIC0xXG4gIGxldCBkZXB0aCA9IDBcbiAgZm9yIChsZXQgaW5kZXggPSBmaXJzdDsgaW5kZXggPCBzb3VyY2UubGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgY29uc3QgY2hhciA9IHNvdXJjZVtpbmRleF1cbiAgICBpZiAoY2hhciA9PT0gJ1xcXFwnKSBpbmRleCArPSAxXG4gICAgZWxzZSBpZiAoY2hhciA9PT0gJ1snKSBkZXB0aCArPSAxXG4gICAgZWxzZSBpZiAoY2hhciA9PT0gJ10nKSB7XG4gICAgICBkZXB0aCAtPSAxXG4gICAgICBpZiAoZGVwdGggPT09IDApIHJldHVybiBpbmRleFxuICAgIH1cbiAgfVxuICByZXR1cm4gLTFcbn1cblxuZnVuY3Rpb24gZGVzdGluYXRpb25SYW5nZShyYXdOb2RlOiBzdHJpbmcsIHR5cGU6IE1hcmtkb3duRGVzdGluYXRpb25Ob2RlWyd0eXBlJ10pOiB7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0ge1xuICBjb25zdCBlbmRPZkxhYmVsID0gbGFiZWxFbmQocmF3Tm9kZSlcbiAgaWYgKGVuZE9mTGFiZWwgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoYG1hcmtkb3duOiBjYW5ub3QgbG9jYXRlIGxhYmVsIGVuZCBpbiAke0pTT04uc3RyaW5naWZ5KHJhd05vZGUpfWApXG4gIGxldCBzdGFydDogbnVtYmVyXG4gIGlmICh0eXBlID09PSAnZGVmaW5pdGlvbicpIHtcbiAgICBjb25zdCBjb2xvbiA9IHJhd05vZGUuaW5kZXhPZignOicsIGVuZE9mTGFiZWwgKyAxKVxuICAgIGlmIChjb2xvbiA9PT0gLTEpIHRocm93IG5ldyBFcnJvcihgbWFya2Rvd246IGNhbm5vdCBsb2NhdGUgZGVmaW5pdGlvbiBzZXBhcmF0b3IgaW4gJHtKU09OLnN0cmluZ2lmeShyYXdOb2RlKX1gKVxuICAgIHN0YXJ0ID0gc2tpcFdoaXRlc3BhY2UocmF3Tm9kZSwgY29sb24gKyAxKVxuICB9IGVsc2Uge1xuICAgIGlmIChyYXdOb2RlW2VuZE9mTGFiZWwgKyAxXSAhPT0gJygnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1hcmtkb3duOiBjYW5ub3QgbG9jYXRlIGlubGluZSBkZXN0aW5hdGlvbiBpbiAke0pTT04uc3RyaW5naWZ5KHJhd05vZGUpfWApXG4gICAgfVxuICAgIHN0YXJ0ID0gc2tpcFdoaXRlc3BhY2UocmF3Tm9kZSwgZW5kT2ZMYWJlbCArIDIpXG4gIH1cbiAgaWYgKHJhd05vZGVbc3RhcnRdID09PSAnPCcpIHtcbiAgICBmb3IgKGxldCBpbmRleCA9IHN0YXJ0ICsgMTsgaW5kZXggPCByYXdOb2RlLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgICAgaWYgKHJhd05vZGVbaW5kZXhdID09PSAnXFxcXCcpIGluZGV4ICs9IDFcbiAgICAgIGVsc2UgaWYgKHJhd05vZGVbaW5kZXhdID09PSAnPicpIHJldHVybiB7IHN0YXJ0OiBzdGFydCArIDEsIGVuZDogaW5kZXggfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG1hcmtkb3duOiBjYW5ub3QgbG9jYXRlIGFuZ2xlLWJyYWNrZXQgZGVzdGluYXRpb24gZW5kIGluICR7SlNPTi5zdHJpbmdpZnkocmF3Tm9kZSl9YClcbiAgfVxuICBsZXQgZGVwdGggPSAwXG4gIGZvciAobGV0IGluZGV4ID0gc3RhcnQ7IGluZGV4IDwgcmF3Tm9kZS5sZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBjb25zdCBjaGFyID0gcmF3Tm9kZVtpbmRleF1cbiAgICBpZiAoY2hhciA9PT0gJ1xcXFwnKSBpbmRleCArPSAxXG4gICAgZWxzZSBpZiAoY2hhciA9PT0gJygnKSBkZXB0aCArPSAxXG4gICAgZWxzZSBpZiAoY2hhciA9PT0gJyknKSB7XG4gICAgICBpZiAoZGVwdGggPT09IDApIHJldHVybiB7IHN0YXJ0LCBlbmQ6IGluZGV4IH1cbiAgICAgIGRlcHRoIC09IDFcbiAgICB9IGVsc2UgaWYgKC9cXHMvLnRlc3QoY2hhciA/PyAnJykgJiYgZGVwdGggPT09IDApIHtcbiAgICAgIHJldHVybiB7IHN0YXJ0LCBlbmQ6IGluZGV4IH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsgc3RhcnQsIGVuZDogcmF3Tm9kZS5sZW5ndGggfVxufVxuXG4vKiogTG9jYXRlIG9uZSBwYXJzZWQgZGVzdGluYXRpb24gaW4gdGhlIG9yaWdpbmFsIE1hcmtkb3duIHdpdGhvdXQgcmVzZXJpYWxpemluZyBpdC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrZG93bkRlc3RpbmF0aW9uKHNvdXJjZTogc3RyaW5nLCBub2RlOiBNYXJrZG93bkRlc3RpbmF0aW9uTm9kZSk6IE1hcmtkb3duRGVzdGluYXRpb24ge1xuICBjb25zdCBzdGFydCA9IG5vZGUucG9zaXRpb24/LnN0YXJ0Lm9mZnNldFxuICBjb25zdCBlbmQgPSBub2RlLnBvc2l0aW9uPy5lbmQub2Zmc2V0XG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBtYXJrZG93bjogZGVzdGluYXRpb24gJHtKU09OLnN0cmluZ2lmeShub2RlLnVybCl9IGhhcyBubyBzb3VyY2Ugb2Zmc2V0c2ApXG4gIH1cbiAgY29uc3QgcmFuZ2UgPSBkZXN0aW5hdGlvblJhbmdlKHNvdXJjZS5zbGljZShzdGFydCwgZW5kKSwgbm9kZS50eXBlKVxuICBjb25zdCBhYnNvbHV0ZSA9IHsgc3RhcnQ6IHN0YXJ0ICsgcmFuZ2Uuc3RhcnQsIGVuZDogc3RhcnQgKyByYW5nZS5lbmQgfVxuICByZXR1cm4geyAuLi5hYnNvbHV0ZSwgdXJsOiBzb3VyY2Uuc2xpY2UoYWJzb2x1dGUuc3RhcnQsIGFic29sdXRlLmVuZCkgfVxufVxuXG4vKipcbiAqIEV4dHJhY3QgZXZlcnkgcGFyc2VkIGNvZGUgYmxvY2sgd2l0aCBpdHMgaW5mbyBzdHJpbmcsIGluIGRvY3VtZW50IG9yZGVyLlxuICogQHBhcmFtIHNvdXJjZSAtIE1hcmtkb3duIHNvdXJjZSB0byBzY2FuLlxuICogQHJldHVybnMgZWFjaCBibG9jaydzIG9wZW5pbmcgbGluZSwgbGFuZ3VhZ2UsIGluZm8gc3RyaW5nLCBhbmQgYm9keS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtkb3duRmVuY2VzKHNvdXJjZTogc3RyaW5nKTogTWFya2Rvd25GZW5jZVtdIHtcbiAgY29uc3QgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IGZlbmNlczogTWFya2Rvd25GZW5jZVtdID0gW11cbiAgdmlzaXRNYXJrZG93bihwYXJzZU1hcmtkb3duKHNvdXJjZSksIChub2RlKSA9PiB7XG4gICAgaWYgKG5vZGUudHlwZSAhPT0gJ2NvZGUnIHx8IG5vZGUucG9zaXRpb24gPT09IHVuZGVmaW5lZCkgcmV0dXJuXG4gICAgY29uc3QgbGFuZyA9IG5vZGUubGFuZyA/PyBudWxsXG4gICAgY29uc3QgbWV0YSA9IG5vZGUubWV0YSA/PyAnJ1xuICAgIGNvbnN0IGluZm8gPSBsYW5nID09PSBudWxsID8gJycgOiBtZXRhID09PSAnJyA/IGxhbmcgOiBgJHtsYW5nfSAke21ldGF9YFxuICAgIGNvbnN0IGVuZExpbmUgPSBsaW5lc1tub2RlLnBvc2l0aW9uLmVuZC5saW5lIC0gMV0gPz8gJydcbiAgICBjb25zdCBjbG9zZWQgPSAvXiB7MCwzfShgezMsfXx+ezMsfSlcXHMqJC8udGVzdChlbmRMaW5lKVxuICAgIGZlbmNlcy5wdXNoKHsgbGluZTogbm9kZS5wb3NpdGlvbi5zdGFydC5saW5lLCBsYW5nLCBpbmZvLCBjb2RlOiBub2RlLnZhbHVlLCBjbG9zZWQgfSlcbiAgfSlcbiAgcmV0dXJuIGZlbmNlc1xufVxuXG4vKiogVGV4dCBhIHJlYWRlciBzZWVzIGZyb20gb25lIE1hcmtkb3duIG5vZGU7IHJhdyBIVE1MIGl0c2VsZiBjb250cmlidXRlcyBub25lLiAqL1xuZnVuY3Rpb24gcmVuZGVyZWRUZXh0KG5vZGU6IE5vZGVzKTogc3RyaW5nIHtcbiAgaWYgKG5vZGUudHlwZSA9PT0gJ3RleHQnIHx8IG5vZGUudHlwZSA9PT0gJ2lubGluZUNvZGUnKSByZXR1cm4gbm9kZS52YWx1ZVxuICBpZiAobm9kZS50eXBlID09PSAnaW1hZ2UnIHx8IG5vZGUudHlwZSA9PT0gJ2ltYWdlUmVmZXJlbmNlJykgcmV0dXJuIG5vZGUuYWx0ID8/ICcnXG4gIGlmIChub2RlLnR5cGUgPT09ICdicmVhaycpIHJldHVybiAnICdcbiAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgcmV0dXJuIG5vZGUuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHJlbmRlcmVkVGV4dChjaGlsZCkpLmpvaW4oJycpXG4gIHJldHVybiAnJ1xufVxuXG4vKiogUmV0dXJuIGV2ZXJ5IHBhcnNlZCBNYXJrZG93biBoZWFkaW5nIHdpdGggaXRzIHJlbmRlcmVkIHRleHQgYW5kIHNvdXJjZSBsaW5lLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtkb3duSGVhZGluZ0xpbmVzKHNvdXJjZTogc3RyaW5nKTogTWFya2Rvd25IZWFkaW5nTGluZVtdIHtcbiAgY29uc3QgcmF3TGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IGhlYWRpbmdzOiBNYXJrZG93bkhlYWRpbmdMaW5lW10gPSBbXVxuICB2aXNpdE1hcmtkb3duKHBhcnNlTWFya2Rvd24oc291cmNlKSwgKG5vZGUpID0+IHtcbiAgICBpZiAobm9kZS50eXBlICE9PSAnaGVhZGluZycgfHwgbm9kZS5wb3NpdGlvbiA9PT0gdW5kZWZpbmVkKSByZXR1cm5cbiAgICBoZWFkaW5ncy5wdXNoKHtcbiAgICAgIGRlcHRoOiBub2RlLmRlcHRoLFxuICAgICAgaW5kZXg6IG5vZGUucG9zaXRpb24uc3RhcnQubGluZSxcbiAgICAgIHJhdzogcmF3TGluZXNbbm9kZS5wb3NpdGlvbi5zdGFydC5saW5lIC0gMV0gPz8gJycsXG4gICAgICB0ZXh0OiByZW5kZXJlZFRleHQobm9kZSksXG4gICAgfSlcbiAgfSlcbiAgcmV0dXJuIGhlYWRpbmdzXG59XG5cbnR5cGUgQ29sdW1uUmFuZ2UgPSByZWFkb25seSBbc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXJdXG50eXBlIE9mZnNldFJhbmdlID0gcmVhZG9ubHkgW3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyXVxuXG4vKiogU291cmNlLWNvbHVtbiByYW5nZXMgb2NjdXBpZWQgYnkgcGFyc2VkIEhUTUwgY29tbWVudHMsIGtleWVkIGJ5IHNvdXJjZSBsaW5lLiAqL1xuZnVuY3Rpb24gaHRtbENvbW1lbnRSYW5nZXMoc291cmNlOiBzdHJpbmcsIHJhd0xpbmVzOiByZWFkb25seSBzdHJpbmdbXSk6IE1hcDxudW1iZXIsIENvbHVtblJhbmdlW10+IHtcbiAgY29uc3QgY29tbWVudHM6IE9mZnNldFJhbmdlW10gPSBbXVxuICB2aXNpdE1hcmtkb3duKHBhcnNlTWFya2Rvd24oc291cmNlKSwgKG5vZGUpID0+IHtcbiAgICBpZiAobm9kZS50eXBlICE9PSAnaHRtbCcgfHwgbm9kZS5wb3NpdGlvbj8uc3RhcnQub2Zmc2V0ID09PSB1bmRlZmluZWQpIHJldHVyblxuICAgIGxldCBjdXJzb3IgPSAwXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gbm9kZS52YWx1ZS5pbmRleE9mKCc8IS0tJywgY3Vyc29yKVxuICAgICAgaWYgKHN0YXJ0IDwgMCkgYnJlYWtcbiAgICAgIGNvbnN0IGNsb3NlID0gbm9kZS52YWx1ZS5pbmRleE9mKCctLT4nLCBzdGFydCArICc8IS0tJy5sZW5ndGgpXG4gICAgICBjb25zdCBlbmQgPSBjbG9zZSA8IDAgPyBub2RlLnZhbHVlLmxlbmd0aCA6IGNsb3NlICsgJy0tPicubGVuZ3RoXG4gICAgICBjb21tZW50cy5wdXNoKFtub2RlLnBvc2l0aW9uLnN0YXJ0Lm9mZnNldCArIHN0YXJ0LCBub2RlLnBvc2l0aW9uLnN0YXJ0Lm9mZnNldCArIGVuZF0pXG4gICAgICBjdXJzb3IgPSBlbmRcbiAgICB9XG4gIH0pXG5cbiAgY29uc3QgcmFuZ2VzID0gbmV3IE1hcDxudW1iZXIsIENvbHVtblJhbmdlW10+KClcbiAgbGV0IGxpbmVPZmZzZXQgPSAwXG4gIHJhd0xpbmVzLmZvckVhY2goKHJhdywgaW5kZXgpID0+IHtcbiAgICBjb25zdCBsaW5lRW5kID0gbGluZU9mZnNldCArIHJhdy5sZW5ndGhcbiAgICBmb3IgKGNvbnN0IFtzdGFydCwgZW5kXSBvZiBjb21tZW50cykge1xuICAgICAgY29uc3QgZnJvbSA9IE1hdGgubWF4KHN0YXJ0LCBsaW5lT2Zmc2V0KVxuICAgICAgY29uc3QgdG8gPSBNYXRoLm1pbihlbmQsIGxpbmVFbmQpXG4gICAgICBjb25zdCBjb3ZlcnNFbXB0eUxpbmUgPSByYXcubGVuZ3RoID09PSAwICYmIHN0YXJ0IDw9IGxpbmVPZmZzZXQgJiYgZW5kID4gbGluZU9mZnNldFxuICAgICAgaWYgKGZyb20gPCB0byB8fCBjb3ZlcnNFbXB0eUxpbmUpIHtcbiAgICAgICAgY29uc3QgbGluZVJhbmdlcyA9IHJhbmdlcy5nZXQoaW5kZXggKyAxKSA/PyBbXVxuICAgICAgICBsaW5lUmFuZ2VzLnB1c2goW2Zyb20gLSBsaW5lT2Zmc2V0LCB0byAtIGxpbmVPZmZzZXRdKVxuICAgICAgICByYW5nZXMuc2V0KGluZGV4ICsgMSwgbGluZVJhbmdlcylcbiAgICAgIH1cbiAgICB9XG4gICAgbGluZU9mZnNldCA9IGxpbmVFbmQgKyAxXG4gIH0pXG4gIHJldHVybiByYW5nZXNcbn1cblxuLyoqIFdoZXRoZXIgYSBzb3VyY2UgbGluZSByZXRhaW5zIG5vbi13aGl0ZXNwYWNlIHRleHQgYWZ0ZXIgSFRNTCBjb21tZW50cyBkaXNhcHBlYXIuICovXG5mdW5jdGlvbiBoYXNSZW5kZXJlZFRleHRPdXRzaWRlQ29tbWVudHMocmF3OiBzdHJpbmcsIHJhbmdlczogcmVhZG9ubHkgQ29sdW1uUmFuZ2VbXSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICBpZiAocmFuZ2VzID09PSB1bmRlZmluZWQpIHJldHVybiB0cnVlXG4gIGxldCBjdXJzb3IgPSAwXG4gIGxldCB2aXNpYmxlID0gJydcbiAgZm9yIChjb25zdCBbc3RhcnQsIGVuZF0gb2YgWy4uLnJhbmdlc10uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnRbMF0gLSByaWdodFswXSkpIHtcbiAgICB2aXNpYmxlICs9IHJhdy5zbGljZShjdXJzb3IsIHN0YXJ0KVxuICAgIGN1cnNvciA9IE1hdGgubWF4KGN1cnNvciwgZW5kKVxuICB9XG4gIHZpc2libGUgKz0gcmF3LnNsaWNlKGN1cnNvcilcbiAgcmV0dXJuIHZpc2libGUudHJpbSgpLmxlbmd0aCA+IDBcbn1cblxuLyoqXG4gKiBSZXR1cm4gc291cmNlIGxpbmVzIG91dHNpZGUgY29kZSBibG9ja3MgYW5kIEhUTUwgY29tbWVudHMuXG4gKiBAcGFyYW0gc291cmNlIC0gTWFya2Rvd24gc291cmNlIHdob3NlIHByb3NlIHNob3VsZCBiZSByZXRhaW5lZCB2ZXJiYXRpbS5cbiAqIEByZXR1cm5zIHVuZmVuY2VkIGxpbmVzIHdpdGggdGhlaXIgb3JpZ2luYWwgMS1iYXNlZCBsb2NhdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrZG93blByb3NlTGluZXMoc291cmNlOiBzdHJpbmcpOiBNYXJrZG93blByb3NlTGluZVtdIHtcbiAgY29uc3QgcmF3TGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IGNvbW1lbnRzID0gaHRtbENvbW1lbnRSYW5nZXMoc291cmNlLCByYXdMaW5lcylcbiAgY29uc3QgZmVuY2VkID0gbmV3IFNldDxudW1iZXI+KClcbiAgdmlzaXRNYXJrZG93bihwYXJzZU1hcmtkb3duKHNvdXJjZSksIChub2RlKSA9PiB7XG4gICAgaWYgKG5vZGUudHlwZSAhPT0gJ2NvZGUnIHx8IG5vZGUucG9zaXRpb24gPT09IHVuZGVmaW5lZCkgcmV0dXJuXG4gICAgZm9yIChsZXQgbGluZSA9IG5vZGUucG9zaXRpb24uc3RhcnQubGluZTsgbGluZSA8PSBub2RlLnBvc2l0aW9uLmVuZC5saW5lOyBsaW5lICs9IDEpIGZlbmNlZC5hZGQobGluZSlcbiAgfSlcbiAgY29uc3Qga2VwdDogTWFya2Rvd25Qcm9zZUxpbmVbXSA9IFtdXG4gIHJhd0xpbmVzLmZvckVhY2goKHJhdywgaSkgPT4ge1xuICAgIGlmIChmZW5jZWQuaGFzKGkgKyAxKSkgcmV0dXJuXG4gICAgaWYgKGhhc1JlbmRlcmVkVGV4dE91dHNpZGVDb21tZW50cyhyYXcsIGNvbW1lbnRzLmdldChpICsgMSkpKSB7XG4gICAgICBrZXB0LnB1c2goeyBpbmRleDogaSArIDEsIHJhdyB9KVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIGtlcHRcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcXHU2NUIwXHU1MjFCXHU2MTBGXHU2Nzg0XHU2MDFEXFxcXENsdXN0ZXItQ29vcGVyYXRpb25cXFxcZGVlcHNlZWstaGFybmVzc1xcXFx3ZWJzaXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxcdTY1QjBcdTUyMUJcdTYxMEZcdTY3ODRcdTYwMURcXFxcQ2x1c3Rlci1Db29wZXJhdGlvblxcXFxkZWVwc2Vlay1oYXJuZXNzXFxcXHdlYnNpdGVcXFxccmF3LW1hcmtkb3duLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi8lRTYlOTYlQjAlRTUlODglOUIlRTYlODQlOEYlRTYlOUUlODQlRTYlODAlOUQvQ2x1c3Rlci1Db29wZXJhdGlvbi9kZWVwc2Vlay1oYXJuZXNzL3dlYnNpdGUvcmF3LW1hcmtkb3duLnRzXCI7LyoqIERldmVsb3BtZW50IHJlc3BvbnNlcyBmb3IgcHVibGlzaGVkIE1hcmtkb3duIGFuZCB0aGUgZG9jdW1lbnRhdGlvbiBpbmRleC4gKi9cbmltcG9ydCB0eXBlIHsgQ29ubmVjdCB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgeyByYXdNYXJrZG93blJvdXRlIH0gZnJvbSAnLi4vc2NyaXB0cy9wcm9qZWN0LWRvYy1zaXRlLnRzJ1xuXG4vKipcbiAqIFNlcnZlIHB1Ymxpc2hlZCBzb3VyY2UgdGV4dCB3aGlsZSBwcmVzZXJ2aW5nIFZpdGUncyBNYXJrZG93biBtb2R1bGUgaW1wb3J0cy5cbiAqIEV4cGxpY2l0IGBkc2gtcmF3PTFgIGZldGNoZXMgcmV0dXJuIDQwNCBmb3IgdW5wdWJsaXNoZWQgTWFya2Rvd24gcm91dGVzLlxuICpcbiAqIEBwYXJhbSBiYXNlIFNpdGUgVVJMIHByZWZpeCB3aXRoIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMuXG4gKiBAcGFyYW0gaW5kZXggUmVuZGVyIHRoZSBjdXJyZW50IGxsbXMudHh0IGluZGV4LlxuICogQHJldHVybnMgTWlkZGxld2FyZSBmb3IgdGhlIFZpdGUgZGV2ZWxvcG1lbnQgc2VydmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmF3TWFya2Rvd25NaWRkbGV3YXJlKGJhc2U6IHN0cmluZywgaW5kZXg6ICgpID0+IHN0cmluZyk6IENvbm5lY3QuTmV4dEhhbmRsZUZ1bmN0aW9uIHtcbiAgcmV0dXJuIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEudXJsID09PSB1bmRlZmluZWQgfHwgKHJlcS5tZXRob2QgIT09ICdHRVQnICYmIHJlcS5tZXRob2QgIT09ICdIRUFEJykpIHtcbiAgICAgIG5leHQoKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxldCB1cmw6IFVSTFxuICAgIHRyeSB7XG4gICAgICB1cmwgPSBuZXcgVVJMKHJlcS51cmwsICdodHRwOi8vZG9jcy5sb2NhbCcpXG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICAvLyBNYWxmb3JtZWQgdGFyZ2V0cyBiZWxvbmcgdG8gVml0ZSdzIHJlcXVlc3QgaGFuZGxpbmcsIG5vdCByYXctcm91dGUgbG9va3VwLlxuICAgICAgbmV4dCgpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCF1cmwucGF0aG5hbWUuc3RhcnRzV2l0aChiYXNlKSkge1xuICAgICAgbmV4dCgpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgcGF0aCA9IHVybC5wYXRobmFtZS5zbGljZShiYXNlLmxlbmd0aClcbiAgICBjb25zdCBleHBsaWNpdCA9IHBhdGguZW5kc1dpdGgoJy5tZCcpICYmIHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdkc2gtcmF3JykgPT09ICcxJ1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gcmVxLmhlYWRlcnNbJ3NlYy1mZXRjaC1kZXN0J11cbiAgICAvLyBTY3JpcHQgaW1wb3J0cyBhbHdheXMgYmVsb25nIHRvIFZpdGUsIGluY2x1ZGluZyBpbXBvcnRzIGNhcnJ5aW5nIGEgcXVlcnkuXG4gICAgaWYgKGRlc3RpbmF0aW9uICE9PSB1bmRlZmluZWQgJiYgZGVzdGluYXRpb24gIT09ICdkb2N1bWVudCcgJiYgIShkZXN0aW5hdGlvbiA9PT0gJ2VtcHR5JyAmJiBleHBsaWNpdCkpIHtcbiAgICAgIG5leHQoKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBwYXRoID09PSAnbGxtcy50eHQnID8gaW5kZXgoKSA6IHBhdGguZW5kc1dpdGgoJy5tZCcpID8gcmF3TWFya2Rvd25Sb3V0ZShwYXRoKSA6IHVuZGVmaW5lZFxuICAgIGlmIChjb250ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghZXhwbGljaXQpIHtcbiAgICAgICAgbmV4dCgpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDRcbiAgICAgIHJlcy5lbmQoKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIGAke3BhdGggPT09ICdsbG1zLnR4dCcgPyAndGV4dC9wbGFpbicgOiAndGV4dC9tYXJrZG93bid9OyBjaGFyc2V0PXV0Zi04YClcbiAgICByZXMuZW5kKHJlcS5tZXRob2QgPT09ICdIRUFEJyA/IHVuZGVmaW5lZCA6IGNvbnRlbnQpXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFFQSxTQUFTLGdCQUFBQSxlQUFjLGlCQUFBQyxzQkFBcUI7QUFDNUMsU0FBUyxXQUFBQyxnQkFBZTtBQUd4QixTQUFTLG1CQUFtQjs7O0FDR3JCLFNBQVMsc0JBQXNCLEtBQXdDO0FBQzVFLFNBQU8sTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUc7QUFBQTtBQUFBO0FBQUEsQ0FHN0IsQ0FBQyxJQUFJLENBQUM7QUFDUDtBQU9PLFNBQVMsdUJBQXVCLElBQTRCO0FBQ2pFLFFBQU0sU0FBUyxHQUFHLFNBQVMsTUFBTSwyQkFBMkI7QUFDNUQsTUFBSSxXQUFXLE9BQVcsT0FBTSxJQUFJLE1BQU0scUVBQXFFO0FBQy9HLEtBQUcsU0FBUyxNQUFNLDJCQUEyQixJQUFJLElBQUksU0FBUztBQUM1RCxVQUFNLE9BQU8sT0FBTyxHQUFHLElBQUk7QUFDM0IsVUFBTSxVQUFVO0FBQ2hCLFVBQU0sVUFBVTtBQUNoQixRQUFJLENBQUMsS0FBSyxTQUFTLE9BQU8sS0FBSyxDQUFDLEtBQUssU0FBUyxPQUFPLEdBQUc7QUFDdEQsWUFBTSxJQUFJLE1BQU0sc0VBQXNFO0FBQUEsSUFDeEY7QUFDQSxXQUFPLEtBQUssUUFBUSxTQUFTLHFDQUFxQyxFQUFFLFFBQVEsU0FBUyw2QkFBNkI7QUFBQSxFQUNwSDtBQUNGOzs7QUMrQkEsU0FBUyxVQUFhLE9BQWtDLFFBQXVCO0FBQzdFLFNBQU8sT0FBTyxVQUFVLFlBQVksVUFBVSxRQUFRLENBQUMsTUFBTSxRQUFRLEtBQUssSUFDckUsTUFBZ0MsTUFBTSxJQUN2QztB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QUFJLGVBQWUsT0FBVyxPQUFNLElBQUksTUFBTSxpRUFBaUU7QUFDL0csVUFBSSxlQUFlLE9BQVcsT0FBTSxJQUFJLE1BQU0sd0VBQXdFO0FBQ3RILFVBQUksZ0JBQWdCLE9BQVcsT0FBTSxJQUFJLE1BQU0sa0VBQWtFO0FBQ2pILFNBQUcsU0FBUyxNQUFNLE9BQU8sSUFBSSxTQUFTLHVCQUF1QixXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ2hGLFNBQUcsU0FBUyxNQUFNLGNBQWMsSUFBSSxTQUFTLHVCQUF1QixXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ3ZGLFlBQU0saUJBQWlCLG9CQUFJLElBQW9CO0FBQy9DLFNBQUcsU0FBUyxNQUFNLFFBQVEsSUFBSSxTQUFTO0FBQ3JDLGNBQU0sQ0FBQyxRQUFRLEtBQUssSUFBSTtBQUN4QixjQUFNLFFBQVEsT0FBTyxLQUFLO0FBQzFCLFlBQUksVUFBVSxPQUFXLE9BQU0sSUFBSSxNQUFNLGtEQUFrRDtBQUUzRixZQUFJLENBQUMsV0FBVyxLQUFLLEVBQUUsU0FBUyxNQUFNLEtBQUssS0FBSyxFQUFFLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRyxRQUFPLFlBQVksR0FBRyxJQUFJO0FBQ3ZHLFlBQUksUUFBUSxJQUFJLE9BQU8sS0FBSyxNQUFNLE9BQVcsUUFBTyxZQUFZLEdBQUcsSUFBSTtBQUV2RSxZQUFJLFFBQVEsSUFBSSxhQUFhLGFBQWMsUUFBTyxZQUFZLEdBQUcsSUFBSTtBQUNyRSxjQUFNLE1BQU0sS0FBSyxVQUFVLENBQUMsTUFBTSxTQUFTLE1BQU0sTUFBTSxNQUFNLFFBQVEsTUFBTSxLQUFLLENBQUM7QUFDakYsY0FBTSxTQUFTLGVBQWUsSUFBSSxHQUFHO0FBQ3JDLFlBQUksV0FBVyxPQUFXLFFBQU87QUFDakMsY0FBTSxPQUFPLFlBQVksR0FBRyxJQUFJO0FBQ2hDLHVCQUFlLElBQUksS0FBSyxJQUFJO0FBQzVCLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQztBQUFBLEVBQ1YsYUFBYTtBQUNmLENBQUM7IiwKICAibmFtZXMiOiBbInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgInJlc29sdmUiLCAiZnJvbU1hcmtkb3duIiwgImdmbUZyb21NYXJrZG93biIsICJnZm0iLCAibG9jYWxpemVkIiwgImZyb21NYXJrZG93biIsICJnZm0iLCAiZ2ZtRnJvbU1hcmtkb3duIiwgImJhc2UiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUiLCAiZGV2ZWxvcCIsICJyZWZlcmVuY2UiLCAicmVhZEZpbGVTeW5jIiwgInJlc29sdmUiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUiLCAid3JpdGVGaWxlU3luYyJdCn0K
