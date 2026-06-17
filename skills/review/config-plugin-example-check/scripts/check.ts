#!/usr/bin/env bun
// Deterministically validates config plugin examples in the Expo docs against the
// actual plugin option types in the monorepo's packages/. No LLM, no heuristics in the
// verdict path for first-party plugins: the source of truth is the TypeScript type that
// is the generic argument of each package's `ConfigPlugin<T>` (read via the TS compiler).
//
// For every config-plugin example it finds, it emits exactly one verdict:
//   validated-type   - checked against the extracted TS option type
//   heuristic-only   - third-party plugin (no monorepo source); quoted-boolean smell check only
//   unresolved       - first-party but the type could not be extracted (reason given)
//   no-props         - plugin used with no options object; nothing to check
// Nothing is silently skipped. Findings of severity `error` set exit code 1.
//
// Usage:
//   bun check.ts [docsRepo] [--versions unversioned,v56.0.0] [--only <plugin>]
//                [--print-schema <plugin>] [--json] [--verbose]
// docsRepo defaults to ~/Documents/GitHub/expo/docs. The monorepo root is its parent.

import { createRequire } from 'node:module';
import { dirname, basename, join, relative } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

// ---------------------------------------------------------------------------
// CLI + path resolution
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
const positional: string[] = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = rawArgs[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    positional.push(a);
  }
}

const HOME = process.env.HOME ?? '';
let docsRepo = positional[0] ?? `${HOME}/Documents/GitHub/expo/docs`;
docsRepo = docsRepo.replace(/\/$/, '');
// Accept either the docs dir or the monorepo root.
let monorepoRoot: string;
if (basename(docsRepo) === 'docs') {
  monorepoRoot = dirname(docsRepo);
} else if (existsSync(join(docsRepo, 'docs', 'pages'))) {
  monorepoRoot = docsRepo;
  docsRepo = join(docsRepo, 'docs');
} else {
  monorepoRoot = dirname(docsRepo);
}
const packagesDir = join(monorepoRoot, 'packages');
const versionsDir = join(docsRepo, 'pages', 'versions');

function fatal(message: string): never {
  console.error(`FATAL ${message}`);
  process.exit(2);
}

if (!existsSync(join(docsRepo, 'pages'))) {
  fatal(
    `docs pages not found at ${docsRepo}/pages - pass the expo/docs checkout path as the first argument (got "${docsRepo}")`
  );
}
if (!existsSync(packagesDir)) {
  fatal(
    `monorepo packages/ not found at ${packagesDir} - this checker reads plugin option types from packages/, so it needs the full expo/expo monorepo, not just a docs export`
  );
}

// Load typescript + json5 from the monorepo (zero install).
const monoRequire = createRequire(join(monorepoRoot, 'package.json'));
let ts: any;
let JSON5: any;
try {
  ts = monoRequire('typescript');
} catch {
  fatal(
    `could not load "typescript" from ${monorepoRoot}/node_modules - run the monorepo's install (e.g. \`yarn\` at the repo root) so packages' deps are present`
  );
}
try {
  JSON5 = monoRequire('json5');
} catch {
  // json5 is optional; fall back to JSON.parse if absent.
  JSON5 = { parse: JSON.parse };
}

// Wrapper plugins whose options live in another package's type.
const PLUGIN_ALIASES: Record<string, string> = {
  'expo-dev-client': 'expo-dev-launcher',
};

// ---------------------------------------------------------------------------
// Detect version scope
// ---------------------------------------------------------------------------

function detectLatestVersion(): string | null {
  if (!existsSync(versionsDir)) return null;
  const versions = readdirSync(versionsDir)
    .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
    .map((d) => d.slice(1).split('.').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const latest = versions.at(-1);
  return latest ? `v${latest.join('.')}` : null;
}

let scopeVersions: string[];
if (typeof flags.versions === 'string') {
  scopeVersions = flags.versions.split(',').map((s) => s.trim()).filter(Boolean);
} else {
  const latest = detectLatestVersion();
  scopeVersions = ['unversioned', ...(latest ? [latest] : [])];
}

// ---------------------------------------------------------------------------
// Type extraction (the source of truth): packages/<pkg> -> option prop schema
// ---------------------------------------------------------------------------

interface PropSchema {
  jsonTypes: string[]; // e.g. ['boolean'], ['string'], ['object'], ['array'], ['number'], ['any']
  optional: boolean;
  enum?: (string | number)[];
  default?: string;
  deprecated?: boolean;
  nested?: Record<string, PropSchema>;
}
interface PluginSchema {
  resolved: boolean;
  thirdParty?: boolean;
  noOptions?: boolean; // plugin takes no config options
  source?: string; // 'ts-type'
  sourceLoc?: string; // file:line of the option type, for provenance
  props?: Record<string, PropSchema>;
  reason?: string;
}

const schemaCache = new Map<string, PluginSchema>();
const programCache = new Map<string, any>();

function createProgram(entry: string, pkgDir: string): any {
  if (programCache.has(entry)) return programCache.get(entry);
  let options: any = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10 ?? ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    noEmit: true,
    allowJs: true,
    esModuleInterop: true,
    strict: false,
  };
  try {
    const configPath = ts.findConfigFile(pkgDir, ts.sys.fileExists, 'tsconfig.json');
    if (configPath) {
      const read = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, ts.sys, dirname(configPath));
      options = { ...parsed.options, noEmit: true, skipLibCheck: true, skipDefaultLibCheck: true };
    }
  } catch {
    // keep defaults
  }
  const program = ts.createProgram([entry], options);
  programCache.set(entry, program);
  return program;
}

// The canonical plugin entry is whatever app.plugin.js loads (e.g.
// `require('./plugin/build/withX')`), mapped from build/ back to its src/ TypeScript.
// This is the file the config system actually runs, so its option type is authoritative
// even when plugin/src/index.ts is a stub (e.g. expo-document-picker).
function resolveAppPluginEntry(pkgDir: string): string | null {
  const appPlugin = join(pkgDir, 'app.plugin.js');
  if (!existsSync(appPlugin)) return null;
  let src: string;
  try {
    src = readFileSync(appPlugin, 'utf8');
  } catch {
    return null;
  }
  const m = src.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
  if (!m) return null;
  const rel = m[1].replace(/\/build(\/|$)/, '/src$1');
  const base = join(pkgDir, rel);
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  return candidates.find((c) => existsSync(c)) ?? null;
}

// Entry files to consult, in priority order: the canonical app.plugin.js target first,
// then the conventional index entries as a fallback.
function pluginEntries(pkgDir: string): string[] {
  const entries: string[] = [];
  const appEntry = resolveAppPluginEntry(pkgDir);
  if (appEntry) entries.push(appEntry);
  for (const c of [
    join(pkgDir, 'plugin', 'src', 'index.ts'),
    join(pkgDir, 'src', 'index.ts'),
    join(pkgDir, 'plugin', 'src', 'index.tsx'),
  ]) {
    if (existsSync(c) && !entries.includes(c)) entries.push(c);
  }
  return entries;
}

function nodePos(node: any): string {
  const sf = node.getSourceFile();
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${relative(monorepoRoot, sf.fileName)}:${line + 1}`;
}

// Extract the `T` type node from a declaration of shape `ConfigPlugin<T>` or a
// 2nd parameter of a plugin function.
function configPluginArg(typeNode: any): any {
  if (typeNode && ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName.getText();
    if (name === 'ConfigPlugin' && typeNode.typeArguments?.length) return typeNode.typeArguments[0];
  }
  return null;
}
// The option type is the last parameter that is not the Expo `config` (the ConfigPlugin
// first param is always named `config`; the docs-facing wrapper's only param is `props`).
function optionParamType(fnNode: any): any {
  const params = fnNode?.parameters ?? [];
  const candidates = params.filter((p: any) => p?.name?.getText?.() !== 'config');
  const p = candidates.at(-1);
  return p?.type ?? null;
}

function propsTypeFromDecl(decl: any): any {
  if (!decl) return null;
  if (ts.isVariableDeclaration(decl)) {
    const fromType = configPluginArg(decl.type);
    if (fromType) return fromType;
    const init = decl.initializer;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
      return optionParamType(init);
    }
  }
  if (ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) {
    return optionParamType(decl);
  }
  return null;
}

// Trace `export default` to the plugin function declaration, then get its option type.
// Returns { node } when a type was found, { none, node } when the plugin is callable but
// takes no options, or null when the default export could not be traced at all.
function findOptionTypeNode(sourceFile: any, checker: any): { node?: any; none?: boolean } | null {
  let exportExpr: any = null;
  sourceFile.forEachChild((node: any) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) exportExpr = node.expression;
  });

  let callable: any = null;
  if (exportExpr) {
    let expr = exportExpr;
    // export default createRunOncePlugin<T>(...) with explicit type args.
    if (ts.isCallExpression(expr)) {
      const callee = expr.expression?.getText?.() ?? '';
      if (expr.typeArguments?.length && /createRunOncePlugin|withRunOnce/.test(callee)) {
        return { node: expr.typeArguments[0] };
      }
      // createRunOncePlugin(withX, ...) -> trace the first argument.
      expr = expr.arguments?.[0];
    }
    if (expr && ts.isIdentifier(expr)) {
      let sym = checker.getSymbolAtLocation(expr);
      // The traced identifier is often imported from another file (e.g.
      // createRunOncePlugin(withDocumentPickerIOS, ...)); resolve the import alias.
      if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
      callable = sym?.valueDeclaration ?? sym?.declarations?.[0] ?? null;
    } else if (expr && (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))) {
      callable = expr;
    }
  }

  if (callable) {
    const node = propsTypeFromDecl(callable);
    if (node) return { node };
    // A traced callable with no non-`config` parameter -> the plugin takes no options.
    return { none: true, node: callable };
  }

  // Fallback: first `ConfigPlugin<...>` annotation anywhere in the file.
  let fallback: any = null;
  const walk = (node: any) => {
    if (fallback) return;
    const arg = configPluginArg(node);
    if (arg) {
      fallback = arg;
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);
  return fallback ? { node: fallback } : null;
}

function isArrayLike(type: any, checker: any): boolean {
  if (checker.isArrayType && checker.isArrayType(type)) return true;
  if (checker.isTupleType && checker.isTupleType(type)) return true;
  const sym = type.symbol ?? type.aliasSymbol;
  const name = sym?.getName?.() ?? sym?.name;
  if (name === 'Array' || name === 'ReadonlyArray') return true;
  return false;
}

function mapJsonTypes(type: any, checker: any): { jsonTypes: string[]; enumVals?: (string | number)[] } {
  const jsonTypes = new Set<string>();
  const enumVals: (string | number)[] = [];
  let enumCandidate = true;

  const visit = (t: any) => {
    const f = t.flags;
    if (f & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void | ts.TypeFlags.Never)) return;
    if (t.isUnion?.()) {
      t.types.forEach(visit);
      return;
    }
    if (f & ts.TypeFlags.BooleanLiteral) {
      jsonTypes.add('boolean');
      enumCandidate = false;
      return;
    }
    if (f & ts.TypeFlags.Boolean) {
      jsonTypes.add('boolean');
      enumCandidate = false;
      return;
    }
    if (f & ts.TypeFlags.StringLiteral) {
      jsonTypes.add('string');
      enumVals.push(t.value);
      return;
    }
    if (f & ts.TypeFlags.NumberLiteral) {
      jsonTypes.add('number');
      enumVals.push(t.value);
      return;
    }
    if (f & ts.TypeFlags.String) {
      jsonTypes.add('string');
      enumCandidate = false;
      return;
    }
    if (f & ts.TypeFlags.Number) {
      jsonTypes.add('number');
      enumCandidate = false;
      return;
    }
    if (f & ts.TypeFlags.Object) {
      jsonTypes.add(isArrayLike(t, checker) ? 'array' : 'object');
      enumCandidate = false;
      return;
    }
    if (f & ts.TypeFlags.Intersection) {
      jsonTypes.add('object');
      enumCandidate = false;
      return;
    }
    if (f & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      jsonTypes.add('any');
      enumCandidate = false;
      return;
    }
    enumCandidate = false;
  };
  visit(type);

  const result: { jsonTypes: string[]; enumVals?: (string | number)[] } = { jsonTypes: [...jsonTypes] };
  if (enumCandidate && enumVals.length && !jsonTypes.has('boolean')) result.enumVals = enumVals;
  return result;
}

function flattenType(type: any, checker: any, decl: any, depth: number): Record<string, PropSchema> {
  const result: Record<string, PropSchema> = {};
  if (depth > 4) return result;
  const members = type.isUnion?.() ? type.types : [type];
  for (const m of members) {
    if (!(m.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection))) continue;
    if (isArrayLike(m, checker)) continue;
    for (const sym of checker.getPropertiesOfType(m)) {
      const name = sym.getName();
      if (name in result) continue;
      const propDecl = sym.valueDeclaration ?? sym.declarations?.[0] ?? decl;
      let propType: any;
      try {
        propType = checker.getTypeOfSymbolAtLocation(sym, propDecl);
      } catch {
        continue;
      }
      const { jsonTypes, enumVals } = mapJsonTypes(propType, checker);
      const optional = (sym.flags & ts.SymbolFlags.Optional) !== 0;
      const tags = sym.getJsDocTags ? sym.getJsDocTags(checker) : [];
      const defTag = tags.find((t: any) => t.name === 'default');
      const deprecated = tags.some((t: any) => t.name === 'deprecated');
      const entry: PropSchema = { jsonTypes, optional };
      if (enumVals) entry.enum = enumVals;
      if (defTag) entry.default = (defTag.text ?? []).map((p: any) => p.text).join('').trim() || undefined;
      if (deprecated) entry.deprecated = true;
      if (jsonTypes.includes('object') && depth < 4) {
        const nn = checker.getNonNullableType(propType);
        const nested = flattenType(nn, checker, propDecl, depth + 1);
        if (Object.keys(nested).length) entry.nested = nested;
      }
      result[name] = entry;
    }
  }
  return result;
}

// Extract the option props from a single entry file. parsed=false means the TS program
// could not even read it; parsed=true with empty props means the plugin takes no options.
function extractFromEntry(entry: string, pkgDir: string): { parsed: boolean; props: Record<string, PropSchema>; sourceLoc?: string; reason?: string } {
  try {
    const program = createProgram(entry, pkgDir);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(entry);
    if (!sourceFile) return { parsed: false, props: {}, reason: `no source file for ${relative(monorepoRoot, entry)}` };
    const result = findOptionTypeNode(sourceFile, checker);
    if (!result) return { parsed: true, props: {}, reason: `could not trace the default export in ${relative(monorepoRoot, entry)}` };
    let props: Record<string, PropSchema> = {};
    if (!result.none) {
      const optionType = checker.getTypeFromTypeNode(result.node);
      props = flattenType(optionType, checker, result.node, 0);
    }
    return { parsed: true, props, sourceLoc: nodePos(result.node) };
  } catch (err: any) {
    return { parsed: false, props: {}, reason: `extraction error in ${relative(monorepoRoot, entry)}: ${err?.message ?? String(err)}` };
  }
}

function extractPluginSchema(pluginName: string): PluginSchema {
  const pkgName = PLUGIN_ALIASES[pluginName] ?? pluginName;
  if (schemaCache.has(pkgName)) return schemaCache.get(pkgName)!;

  let schema: PluginSchema;
  const pkgDir = join(packagesDir, pkgName);
  if (!existsSync(pkgDir)) {
    schema = { resolved: false, thirdParty: true, reason: `no packages/${pkgName} in monorepo (third-party or non-plugin)` };
  } else {
    const entries = pluginEntries(pkgDir);
    if (!entries.length) {
      schema = { resolved: false, reason: `no plugin source (looked for app.plugin.js target, plugin/src/index.ts, src/index.ts)` };
    } else {
      // First entry that yields options wins; the canonical app.plugin.js target is tried
      // first, so a stub index.ts can't mask the real options.
      let chosen: { props: Record<string, PropSchema>; sourceLoc?: string } | null = null;
      let anyParsed = false;
      const reasons: string[] = [];
      for (const entry of entries) {
        const r = extractFromEntry(entry, pkgDir);
        if (r.parsed) anyParsed = true;
        if (r.reason) reasons.push(r.reason);
        if (Object.keys(r.props).length) {
          chosen = { props: r.props, sourceLoc: r.sourceLoc };
          break;
        }
        if (!chosen && r.parsed) chosen = { props: {}, sourceLoc: r.sourceLoc };
      }
      if (!anyParsed) {
        schema = { resolved: false, reason: reasons.join('; ') || 'no parseable plugin entry' };
      } else {
        const props = chosen?.props ?? {};
        const noOptions = Object.keys(props).length === 0;
        schema = {
          resolved: true,
          source: 'ts-type',
          sourceLoc: chosen?.sourceLoc ?? `${relative(monorepoRoot, entries[0])}:1`,
          props,
          ...(noOptions ? { noOptions: true } : {}),
        };
      }
    }
  }
  schemaCache.set(pkgName, schema);
  return schema;
}

// ---------------------------------------------------------------------------
// Example discovery + parsing
// ---------------------------------------------------------------------------

interface PluginEntry {
  name: string;
  props: Record<string, any> | null;
}
interface ExampleBlock {
  file: string; // relative to docsRepo
  blockLine: number; // 1-based line in file where the code fence opens
  text: string; // raw code (with normalization applied at parse time)
  inComponent: boolean;
}

const JSON_LANGS = new Set(['json', 'json5', 'jsonc']);

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

function findExampleBlocks(mdx: string, file: string): ExampleBlock[] {
  const blocks: ExampleBlock[] = [];

  // Component regions: <ConfigPluginExample ...> ... </ConfigPluginExample>
  const componentRanges: [number, number][] = [];
  const compRe = /<ConfigPluginExample[\s\S]*?<\/ConfigPluginExample>/g;
  let cm: RegExpExecArray | null;
  while ((cm = compRe.exec(mdx))) componentRanges.push([cm.index, cm.index + cm[0].length]);
  const inComponent = (idx: number) => componentRanges.some(([s, e]) => idx >= s && idx <= e);

  // Fenced code blocks.
  const fenceRe = /```([^\n`]*)\n([\s\S]*?)```/g;
  let fm: RegExpExecArray | null;
  while ((fm = fenceRe.exec(mdx))) {
    const meta = fm[1].trim();
    const lang = meta.split(/\s+/)[0]?.toLowerCase() ?? '';
    const code = fm[2];
    if (!JSON_LANGS.has(lang)) continue;
    const within = inComponent(fm.index);
    if (!within && !/["']plugins["']\s*:/.test(code)) continue;
    blocks.push({ file, blockLine: lineOf(mdx, fm.index), text: code, inComponent: within });
  }
  return blocks;
}

function parseExample(code: string): { ok: true; value: any } | { ok: false; error: string } {
  // Replace docs code-block template variables ({{ ... }}) with null (a value that is
  // valid in both value and in-string positions). null values are skipped by the validator.
  const normalized = code.replace(/\{\{[^}]*\}\}/g, 'null');
  try {
    return { ok: true, value: JSON5.parse(normalized) };
  } catch (err: any) {
    return { ok: false, error: (err?.message ?? String(err)).split('\n')[0] };
  }
}

function collectPluginEntries(value: any): PluginEntry[] {
  const out: PluginEntry[] = [];
  const plugins = value?.plugins ?? value?.expo?.plugins;
  if (!Array.isArray(plugins)) return out;
  for (const p of plugins) {
    if (typeof p === 'string') {
      out.push({ name: p, props: null });
    } else if (Array.isArray(p) && typeof p[0] === 'string') {
      const props = p[1] && typeof p[1] === 'object' && !Array.isArray(p[1]) ? p[1] : null;
      out.push({ name: p[0], props });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Severity = 'error' | 'warning' | 'info';
interface Finding {
  file: string;
  line: number;
  severity: Severity;
  kind: string;
  plugin: string;
  message: string;
  provenance?: string;
}

function jsonTypeOf(v: any): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'boolean' | 'string' | 'number' | 'object'
}

// Find the precise line of a `"key"` within a code block (for file:line accuracy).
function keyLine(block: ExampleBlock, key: string): number {
  const m = new RegExp(`["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*:`).exec(block.text);
  // blockLine is the fence line; code starts on the next line, so add the in-code line.
  if (!m) return block.blockLine + 1;
  return block.blockLine + lineOf(block.text, m.index);
}

function validateProps(
  props: Record<string, any>,
  schemaProps: Record<string, PropSchema>,
  plugin: string,
  block: ExampleBlock,
  provenance: string | undefined,
  findings: Finding[],
  pathPrefix: string,
  noOptions: boolean
): void {
  for (const [key, value] of Object.entries(props)) {
    const spec = schemaProps[key];
    const line = keyLine(block, key);
    const label = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (!spec) {
      findings.push({
        file: block.file,
        line,
        severity: 'warning',
        kind: 'unknown-prop',
        plugin,
        message: noOptions ? `${label}: ${plugin} takes no config options` : `${label}: not an option of ${plugin}`,
        provenance,
      });
      continue;
    }
    const got = jsonTypeOf(value);
    if (got === 'null') continue; // templated / unknown value
    if (spec.jsonTypes.includes('any')) continue;
    if (got === 'object' && spec.jsonTypes.includes('object') && spec.nested) {
      validateProps(value, spec.nested, plugin, block, provenance, findings, label, false);
      continue;
    }
    if (!spec.jsonTypes.includes(got)) {
      findings.push({
        file: block.file,
        line,
        severity: 'error',
        kind: 'type-mismatch',
        plugin,
        message: `${label}: ${JSON.stringify(value)} (${got}) should be ${spec.jsonTypes.join('|')}`,
        provenance,
      });
      continue;
    }
    if (got === 'string' && spec.enum && !spec.enum.includes(value)) {
      findings.push({
        file: block.file,
        line,
        severity: 'error',
        kind: 'invalid-enum',
        plugin,
        message: `${label}: ${JSON.stringify(value)} not in {${spec.enum.map((e) => JSON.stringify(e)).join(', ')}}`,
        provenance,
      });
    }
  }
}

interface VerdictTally {
  validatedType: number;
  heuristicOnly: number;
  unresolved: number;
  noProps: number;
  unparseable: number;
}

function heuristicCheck(entry: PluginEntry, block: ExampleBlock, findings: Finding[]): void {
  for (const [key, value] of Object.entries(entry.props ?? {})) {
    if (value === 'true' || value === 'false') {
      findings.push({
        file: block.file,
        line: keyLine(block, key),
        severity: 'warning',
        kind: 'heuristic-quoted-boolean',
        plugin: entry.name,
        message: `${key}: ${JSON.stringify(value)} looks like a quoted boolean (3rd-party; unconfirmed)`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// --print-schema mode
// ---------------------------------------------------------------------------

if (typeof flags['print-schema'] === 'string') {
  const name = flags['print-schema'] as string;
  const schema = extractPluginSchema(name);
  console.log(JSON.stringify(schema, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const onlyPlugin = typeof flags.only === 'string' ? (flags.only as string) : null;
const verbose = !!flags.verbose;

const findings: Finding[] = [];
const tally: VerdictTally = { validatedType: 0, heuristicOnly: 0, unresolved: 0, noProps: 0, unparseable: 0 };
const unresolvedReasons = new Map<string, string>();
let totalBlocks = 0;
let totalEntries = 0;
let filesScanned = 0;

const glob = new Bun.Glob('**/*.mdx');
for (const version of scopeVersions) {
  const versionRoot = join(versionsDir, version);
  if (!existsSync(versionRoot)) {
    console.error(`WARN version scope "${version}" not found at ${versionRoot} - skipping`);
    continue;
  }
  for (const rel of glob.scanSync(versionRoot)) {
    const abs = join(versionRoot, rel);
    const fileRel = relative(docsRepo, abs);
    let mdx: string;
    try {
      mdx = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (!mdx.includes('plugins')) continue;
    filesScanned++;
    const blocks = findExampleBlocks(mdx, fileRel);
    for (const block of blocks) {
      totalBlocks++;
      const parsed = parseExample(block.text);
      if (!parsed.ok) {
        // Only report unparseable blocks with a plugins array (and not when --only filters).
        if (!onlyPlugin && /["']plugins["']\s*:/.test(block.text)) {
          tally.unparseable++;
          // A type sketch (bare type names as values) or an intentional `...` partial is not
          // a bug. A block inside <ConfigPluginExample> that is neither is malformed JSON
          // shown to users -> warn.
          const looksLikeTypeSketch = /:\s*(string|boolean|number|object|any)(\s*\[\s*\])?\s*([|,}\r\n]|$)/.test(block.text);
          const looksPartial = /(^|[\s,[{])\.\.\.(\s|[,\]}]|$)/m.test(block.text);
          const malformed = block.inComponent && !looksLikeTypeSketch && !looksPartial;
          findings.push({
            file: block.file,
            line: block.blockLine,
            severity: malformed ? 'warning' : 'info',
            kind: malformed ? 'malformed-json' : 'unparseable',
            plugin: '(block)',
            message: malformed
              ? `malformed-json: example block is not valid JSON (${parsed.error})`
              : `unparseable as JSON5 (${parsed.error})`,
          });
        }
        continue;
      }
      const entries = collectPluginEntries(parsed.value);
      for (const entry of entries) {
        if (onlyPlugin && entry.name !== onlyPlugin && (PLUGIN_ALIASES[entry.name] ?? entry.name) !== onlyPlugin) continue;
        totalEntries++;
        if (!entry.props || Object.keys(entry.props).length === 0) {
          tally.noProps++;
          continue;
        }
        const schema = extractPluginSchema(entry.name);
        if (!schema.resolved) {
          if (schema.thirdParty) {
            tally.heuristicOnly++;
            heuristicCheck(entry, block, findings);
          } else {
            tally.unresolved++;
            unresolvedReasons.set(entry.name, schema.reason ?? 'unknown');
            findings.push({
              file: block.file,
              line: block.blockLine,
              severity: 'info',
              kind: 'unresolved',
              plugin: entry.name,
              message: `could not extract option type: ${schema.reason}`,
            });
          }
          continue;
        }
        tally.validatedType++;
        validateProps(entry.props, schema.props!, entry.name, block, schema.sourceLoc, findings, '', !!schema.noOptions);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (flags.json) {
  console.log(JSON.stringify({ scopeVersions, tally, findings, unresolved: Object.fromEntries(unresolvedReasons) }, null, 2));
} else {
  const short = (p: string) => p.replace('pages/versions/', '');
  const bySrc = (a: Finding, b: Finding) => short(a.file).localeCompare(short(b.file)) || a.line - b.line;
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const infos = findings.filter((f) => f.severity === 'info');

  console.log(`config-plugin-example-check · ${scopeVersions.join(', ')}`);
  console.log('');

  const shown = [...errors, ...warnings].sort(bySrc);
  if (!shown.length) {
    console.log('No errors or warnings. ✔');
  } else {
    for (const f of shown) {
      const tag = f.severity === 'error' ? 'ERROR' : 'WARN ';
      console.log(`${tag}  ${short(f.file)}:${f.line}  ${f.message}${f.provenance ? `  (src: ${f.provenance})` : ''}`);
    }
  }

  if (verbose && infos.length) {
    console.log('');
    for (const f of infos.sort(bySrc)) console.log(`info   ${short(f.file)}:${f.line}  [${f.kind}] ${f.message}`);
  }

  console.log('');
  console.log(
    `${tally.validatedType} type-checked · ${tally.heuristicOnly} heuristic · ${tally.unresolved} unresolved · ` +
      `${tally.noProps} no-options · ${tally.unparseable} unparseable  ·  ${filesScanned} files / ${totalBlocks} blocks / ${totalEntries} entries`
  );
  console.log(`${errors.length} errors, ${warnings.length} warnings, ${infos.length} info → exit ${errors.length ? 1 : 0}`);

  if (tally.unresolved > 0) {
    console.log('');
    console.log('Unresolved — NOT fact-checked:');
    for (const [name, reason] of [...unresolvedReasons.entries()].sort()) console.log(`  ${name}: ${reason}`);
  }
}

const hasErrors = findings.some((f) => f.severity === 'error');
process.exit(hasErrors ? 1 : 0);
