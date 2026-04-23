#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * RBAC generator for feature-key permissions + (optional) scope targets + migration backfill.
 *
 * Usage examples:
 *   node backend/scripts/rbac-gen.js zalo --scoped --features customers.list,customers.view,chat.view,chat.send
 *   node backend/scripts/rbac-gen.js zalo --features zalo.customers.list,zalo.chat.send --non-admin-default deny
 *
 * What it does:
 * - Adds a new node to backend/rbac/features.js FEATURE_TREE (so Settings UI auto shows checkboxes)
 * - Optionally adds a scope target to SCOPE_TARGETS (own/group/shop selection in Settings)
 * - Creates a migration to backfill role_feature_permissions for all shops/roles (strict mode: missing = deny)
 * - Optionally creates a route skeleton file
 *
 * Notes:
 * - This script uses simple string patching (no AST) to match repo style.
 * - Run it once per module, then adjust labels/permissions in code as needed.
 */

const fs = require('fs');
const path = require('path');

function usage(exitCode = 1) {
  console.log(
    [
      'Usage:',
      '  node backend/scripts/rbac-gen.js <module> --features <csv> [--scoped] [--module-name <name>]',
      'Options:',
      '  --features <csv>           Comma-separated features. Accepts either leaf (customers.list) or full key (zalo.customers.list).',
      '  --scoped                   Add <module> into SCOPE_TARGETS for own/group/shop data filtering.',
      '  --module-name <name>       Display name in Settings UI (default: Module <module>).',
      '  --non-admin-default <val>  Default allowed for non-admin roles in backfill migration: allow|deny (default: deny).',
      '  --route                    Create backend/routes/<module>.js skeleton (does NOT auto-mount in server.js).',
    ].join('\n')
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    const takesValue = next != null && !String(next).startsWith('--');
    args[key] = takesValue ? next : true;
    if (takesValue) i++;
  }
  return args;
}

function normalizeModuleId(raw) {
  const m = String(raw || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(m)) {
    throw new Error('module id invalid: use [a-z][a-z0-9_]* (2..32 chars).');
  }
  return m;
}

function toCsvList(v) {
  const s = String(v || '').trim();
  if (!s) return [];
  return s
    .split(',')
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function titleFromKey(k) {
  // Basic label: "customers.list" => "Customers list"
  const s = String(k || '').replace(/[_\-]+/g, ' ').trim();
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeText(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function nextMigrationNumber(migrationsDirAbs) {
  const entries = fs.readdirSync(migrationsDirAbs);
  let max = 0;
  for (const f of entries) {
    const m = String(f).match(/^(\d+)_/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, '0');
}

function patchFeaturesJs(featuresPathAbs, moduleId, moduleName, featureLeafs, scoped) {
  const original = readText(featuresPathAbs);

  const fullKeys = featureLeafs.map((leaf) => {
    const s = String(leaf);
    if (s.includes('.')) {
      // If user passed full key e.g. "zalo.customers.list"
      if (s.startsWith(moduleId + '.')) return s;
      // If user passed "customers.list"
      return `${moduleId}.${s}`;
    }
    return `${moduleId}.${s}`;
  });

  const treeNodeLines = [
    '  {',
    `    key: '${moduleId}',`,
    `    name: '${moduleName}',`,
    '    children: [',
    ...fullKeys.map((k) => `      { key: '${k}', name: '${titleFromKey(k)}' },`),
    '    ],',
    '  },',
  ];

  let out = original;
  const newKeys = [];

  // 1) Insert FEATURE_TREE node if not already present
  if (!out.includes(`key: '${moduleId}'`)) {
    const anchor = '\n];\n\nfunction flattenFeatureKeys';
    const idx = out.indexOf(anchor);
    if (idx === -1) throw new Error('Could not find FEATURE_TREE closing anchor in features.js');
    out = out.slice(0, idx + 1) + treeNodeLines.join('\n') + '\n' + out.slice(idx + 1);
    newKeys.push(...fullKeys);
  } else {
    // Module exists: append missing leaf keys into its children list (best-effort string patch).
    const modIdx = out.indexOf(`key: '${moduleId}'`);
    if (modIdx !== -1) {
      const childrenIdx = out.indexOf('children: [', modIdx);
      if (childrenIdx !== -1) {
        const closeIdx = out.indexOf('    ],', childrenIdx);
        if (closeIdx !== -1) {
          const missing = fullKeys.filter((k) => !out.includes(`key: '${k}'`));
          if (missing.length) {
            const insert = missing.map((k) => `      { key: '${k}', name: '${titleFromKey(k)}' },`).join('\n') + '\n';
            out = out.slice(0, closeIdx) + insert + out.slice(closeIdx);
            newKeys.push(...missing);
          }
        }
      }
    }
  }

  // 2) Optionally add SCOPE_TARGETS entry
  if (scoped && !out.includes(`{ id: '${moduleId}'`)) {
    const marker = 'const SCOPE_TARGETS = [';
    const mi = out.indexOf(marker);
    if (mi === -1) throw new Error('Could not find SCOPE_TARGETS in features.js');
    const insertAt = out.indexOf('[', mi) + 1;
    const entry = `\n  { id: '${moduleId}', name: '${moduleName}' },`;
    out = out.slice(0, insertAt) + entry + out.slice(insertAt);
  }

  if (out !== original) writeText(featuresPathAbs, out);
  return { fullKeys, newKeys };
}

function createBackfillMigration(migrationsDirAbs, moduleId, fullKeys, nonAdminDefault) {
  const n = nextMigrationNumber(migrationsDirAbs);
  const filename = `${n}_rbac_add_${moduleId}_features.sql`;
  const fileAbs = path.join(migrationsDirAbs, filename);

  const defaultNonAdminAllowed = nonAdminDefault === 'allow' ? 1 : 0;

  const stmts = fullKeys
    .map((k) => {
      const key = String(k).replace(/'/g, "''");
      return (
        `INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed)\n` +
        `SELECT s.id AS shop_id, r.id AS role_id, '${key}' AS feature_key,\n` +
        `       CASE WHEN COALESCE(r.can_access_admin, 0) = 1 OR LOWER(TRIM(r.code)) = 'admin'\n` +
        `            THEN 1 ELSE ${defaultNonAdminAllowed} END AS allowed\n` +
        `FROM shops s\n` +
        `JOIN roles r ON r.shop_id IN (0, s.id)\n` +
        `ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);\n`
      );
    })
    .join('\n');

  const content =
    `-- ${filename}\n` +
    `-- Auto-generated by backend/scripts/rbac-gen.js\n` +
    `-- Adds feature keys for module '${moduleId}' and backfills role_feature_permissions for all shops.\n` +
    `\n` +
    `SET NAMES utf8mb4;\n` +
    `SET FOREIGN_KEY_CHECKS = 0;\n` +
    `\n` +
    `${stmts}\n` +
    `SET FOREIGN_KEY_CHECKS = 1;\n`;

  writeText(fileAbs, content);
  return { filename, fileAbs };
}

function createRouteSkeleton(routesDirAbs, moduleId, scoped) {
  const fileAbs = path.join(routesDirAbs, `${moduleId}.js`);
  if (fs.existsSync(fileAbs)) return { created: false, fileAbs };

  const content =
    `const express = require('express');\n` +
    `const router = express.Router();\n` +
    `\n` +
    `const auth = require('../middleware/auth');\n` +
    `const requireShop = require('../middleware/requireShop');\n` +
    `const { requireFeature } = require('../middleware/requireFeature');\n` +
    `${scoped ? `const { getScope } = require('../utils/scope');\n` : ''}` +
    `\n` +
    `// TODO: Mount this router in backend/server.js\n` +
    `// Example: app.use('/api/${moduleId}', require('./routes/${moduleId}'));\n` +
    `\n` +
    `router.get('/health', auth, requireShop, requireFeature('${moduleId}.view'), async (req, res) => {\n` +
    `${scoped ? `  const scope = await getScope(req, '${moduleId}');\n  return res.json({ ok: true, scope });\n` : `  return res.json({ ok: true });\n`}` +
    `});\n` +
    `\n` +
    `module.exports = router;\n`;

  writeText(fileAbs, content);
  return { created: true, fileAbs };
}

function main() {
  const args = parseArgs(process.argv);
  const moduleId = normalizeModuleId(args._[0]);

  const featureLeafs = toCsvList(args.features);
  if (!featureLeafs.length) usage(1);

  const moduleName = args['module-name'] ? String(args['module-name']).trim() : `Module ${moduleId}`;
  const scoped = args.scoped === true || String(args.scoped || '').toLowerCase() === 'true';
  const route = args.route === true || String(args.route || '').toLowerCase() === 'true';
  const nonAdminDefaultRaw = String(args['non-admin-default'] || 'deny').trim().toLowerCase();
  const nonAdminDefault = nonAdminDefaultRaw === 'allow' ? 'allow' : 'deny';

  const repoRoot = path.resolve(__dirname, '..', '..');
  const featuresPathAbs = path.join(repoRoot, 'backend', 'rbac', 'features.js');
  const migrationsDirAbs = path.join(repoRoot, 'migrations');
  const routesDirAbs = path.join(repoRoot, 'backend', 'routes');

  console.log(`[rbac-gen] module=${moduleId} scoped=${scoped} nonAdminDefault=${nonAdminDefault}`);

  const { fullKeys, newKeys } = patchFeaturesJs(featuresPathAbs, moduleId, moduleName, featureLeafs, scoped);
  console.log(`[rbac-gen] Feature keys requested: ${fullKeys.length}; newly added: ${newKeys.length}`);

  if (newKeys.length) {
    ensureDir(migrationsDirAbs);
    const mig = createBackfillMigration(migrationsDirAbs, moduleId, newKeys, nonAdminDefault);
    console.log(`[rbac-gen] Created migration: ${mig.filename}`);
  } else {
    console.log('[rbac-gen] No new keys detected. Skip migration.');
  }

  if (route) {
    ensureDir(routesDirAbs);
    const r = createRouteSkeleton(routesDirAbs, moduleId, scoped);
    console.log(`[rbac-gen] Route skeleton: ${r.created ? 'created' : 'exists'} at ${r.fileAbs}`);
  }

  console.log('[rbac-gen] Done.');
}

try {
  main();
} catch (e) {
  console.error('[rbac-gen] ERROR:', e && e.message ? e.message : e);
  process.exit(1);
}

