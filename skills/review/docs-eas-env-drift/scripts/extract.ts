// Diffs the built-in EAS Build env vars documented in expo/docs against their definition
// sites in expo/eas-cli, printing prefixed finding lines for the skill to interpret.

const WORKER_URL =
  'https://raw.githubusercontent.com/expo/eas-cli/main/packages/worker/src/env.ts';
const LOCAL_URL =
  'https://raw.githubusercontent.com/expo/eas-cli/main/packages/local-build-plugin/src/build.ts';
const DOCS_PAGE = 'pages/eas/environment-variables/usage.mdx';
const COLLAPSIBLE_MARKER = '<Collapsible summary="Built-in environment variables">';

// Vars the docs list on purpose even though no runner sets them (user-set input flags).
const KNOWN_ASYMMETRIES: Record<string, string> = {
  EAS_BUILD_DISABLE_BUNDLE_JAVASCRIPT_STEP: 'user-set input flag, documented on purpose',
};

// The documented contract is EAS_BUILD* plus CI; everything else in env.ts is infra tuning.
const SCOPE = /^(EAS_BUILD[A-Z0-9_]*|CI)$/;

// Var name to literal value when the source assigns one, null when it is computed.
type Vars = Map<string, string | null>;

function fail(message: string): never {
  console.log(`FATAL ${message}`);
  process.exit(1);
}

async function fetchSource(url: string): Promise<string> {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) {
    fail(
      `cannot fetch ${url} (${response?.status ?? 'network error'}) - these packages moved repos before (eas-build to eas-cli); locate the current definition site before re-running`
    );
  }
  return await response.text();
}

function collect(source: string, pattern: RegExp, label: string): Vars {
  const vars: Vars = new Map();
  for (const match of source.matchAll(pattern)) {
    if (SCOPE.test(match[1])) {
      vars.set(match[1], match[2] ?? null);
    }
  }
  if (vars.size === 0) {
    fail(`zero in-scope vars extracted from ${label} - the file structure changed; update this script`);
  }
  return vars;
}

const docsRepo = process.argv[2] ?? `${process.env.HOME}/Documents/GitHub/expo/docs`;
const docsPath = `${docsRepo}/${DOCS_PAGE}`;
const docsFile = Bun.file(docsPath);
if (!(await docsFile.exists())) {
  fail(`docs page not found at ${docsPath} - pass the expo/docs checkout path as the first argument`);
}

const mdx = await docsFile.text();
const collapsibleStart = mdx.indexOf(COLLAPSIBLE_MARKER);
const collapsibleEnd = mdx.indexOf('</Collapsible>', collapsibleStart);
if (collapsibleStart === -1 || collapsibleEnd === -1) {
  fail(`"${COLLAPSIBLE_MARKER}" not found in ${DOCS_PAGE} - the page was restructured; update this script`);
}

const docs = collect(
  mdx.slice(collapsibleStart, collapsibleEnd),
  /^- `([A-Z0-9_]+)(?:=([^`]+))?`/gm,
  'the docs collapsible'
);
const cloud = collect(
  await fetchSource(WORKER_URL),
  /setEnv\(\s*env,\s*'([A-Z0-9_]+)',\s*(?:'([^']*)')?/g,
  'the cloud worker env.ts'
);
const local = collect(
  await fetchSource(LOCAL_URL),
  /^\s*(EAS_BUILD[A-Z0-9_]*|CI):\s*(?:'([^']*)')?/gm,
  'the local-build-plugin build.ts'
);

const names = [...new Set([...docs.keys(), ...cloud.keys(), ...local.keys()])].sort();
for (const name of names) {
  const inDocs = docs.has(name);
  const inCloud = cloud.has(name);
  const inLocal = local.has(name);

  if (!inDocs) {
    const runners = [inCloud && 'cloud', inLocal && 'local'].filter(Boolean).join('+');
    console.log(`UNDOCUMENTED ${name} ${runners}`);
  } else if (!inCloud && !inLocal) {
    const known = KNOWN_ASYMMETRIES[name];
    console.log(known ? `EXPECTED ${name} ${known}` : `STALE ${name}`);
  } else if (!inLocal) {
    console.log(`CLOUD_ONLY ${name}`);
  } else if (!inCloud) {
    console.log(`LOCAL_ONLY ${name}`);
  }

  // A documented literal a runner contradicts is drift even when the name matches.
  const claimed = docs.get(name);
  if (claimed) {
    const runnerValues = [
      ['cloud', cloud.get(name)],
      ['local', local.get(name)],
    ].filter(([, value]) => value && value !== claimed);
    if (runnerValues.length > 0) {
      const detail = runnerValues.map(([runner, value]) => `${runner}=${value}`).join(' ');
      console.log(`VALUE_MISMATCH ${name} docs=${claimed} ${detail}`);
    }
  }
}

console.log(`COUNTS docs=${docs.size} cloud=${cloud.size} local=${local.size}`);
