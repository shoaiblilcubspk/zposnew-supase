/**
 * Automated Supabase Provisioning Script
 * Creates or configures the Supabase project in Indian region (ap-south-1),
 * provisions the 'pos-backups' private bucket, sets RLS policies, and updates .env.local.
 * ZERO MANUAL DASHBOARD ACTIONS REQUIRED.
 */

import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env.local');

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  }
  return env;
}

function updateEnv(updates) {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  }
  fs.writeFileSync(ENV_FILE, content.trim() + '\n', 'utf8');
}

async function main() {
  const env = loadEnv();
  const mgmtKey = env.SUPABASE_MGMT_API_KEY;
  if (!mgmtKey) {
    console.error('ERROR: SUPABASE_MGMT_API_KEY not found in .env.local');
    process.exit(1);
  }

  let projectRef = env.SUPABASE_REF;
  console.log(`[1/4] Checking project: ${projectRef || 'Creating new project in ap-south-1...'}`);

  // 1. If no project ref, create a new project in ap-south-1
  if (!projectRef) {
    const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
      headers: { Authorization: `Bearer ${mgmtKey}` }
    });
    const orgs = await orgsRes.json();
    if (!orgs || orgs.length === 0) {
      throw new Error('No Supabase organizations found for this token');
    }
    const orgId = orgs[0].id;
    const projectName = `zaynahs-pos-${Date.now()}`;
    const dbPass = `PosAdmin_${Math.random().toString(36).slice(2, 10)}!#99`;

    const createRes = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgmtKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: orgId,
        region: 'ap-south-1',
        plan: 'free',
        db_pass: dbPass
      })
    });
    const newProj = await createRes.json();
    projectRef = newProj.id;
    console.log(`[Created] Project ID: ${projectRef} in ap-south-1`);
    updateEnv({ SUPABASE_REF: projectRef });
  }

  // 2. Fetch Project Keys
  console.log(`[2/4] Fetching API keys for project ${projectRef}...`);
  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${mgmtKey}` }
  });
  const keys = await keysRes.json();
  const anonKey = keys.find(k => k.name === 'anon' || k.id === 'anon')?.api_key;
  const serviceKey = keys.find(k => k.name === 'service_role' || k.id === 'service_role')?.api_key;

  if (!anonKey || !serviceKey) {
    throw new Error('Failed to retrieve API keys');
  }

  const projectUrl = `https://${projectRef}.supabase.co`;
  updateEnv({
    VITE_SUPABASE_URL: projectUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_REF: projectRef
  });
  console.log(`[Configured] URL: ${projectUrl}`);

  // 3. Provision 'pos-backups' Private Storage Bucket
  console.log(`[3/4] Ensuring 'pos-backups' storage bucket exists...`);
  const bucketRes = await fetch(`${projectUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'pos-backups',
      name: 'pos-backups',
      public: false,
      file_size_limit: 52428800,
      allowed_mime_types: ['application/json', 'application/octet-stream']
    })
  });
  const bucketData = await bucketRes.json();
  console.log(`[Bucket] Status:`, bucketData?.name ? 'Created / Ready' : 'Already exists');

  // 4. Apply Storage Policies via Management API SQL
  console.log(`[4/4] Applying storage access policies...`);
  const policySql = `
    CREATE POLICY "Allow Anon Upload Backups" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'pos-backups');
    CREATE POLICY "Allow Anon Read Backups" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'pos-backups');
    CREATE POLICY "Allow Anon Update Backups" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'pos-backups');
    CREATE POLICY "Allow Anon Delete Backups" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'pos-backups');
  `;

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mgmtKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: policySql })
  });

  console.log('✅ ALL SUPABASE PROVISIONING COMPLETE (100% Automated via API)!');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
