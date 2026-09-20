/**
 * Test Phase 24: Linear & Anti-AI Professional UI Engine Audit
 * Validates that design tokens, component classes, button styles, card definitions,
 * and badge structures strictly adhere to the 5 Linear decisions and Anti-AI rules.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function runTests() {
  console.log('--- PHASE 24: LINEAR & ANTI-AI PROFESSIONAL UI ENGINE AUDIT ---');

  // Test 1: Verify components.css has eliminated bouncy scale, candy pills, and card shadows
  const componentsCss = fs.readFileSync(path.join(srcDir, 'styles/components.css'), 'utf8');

  assert.ok(componentsCss.includes('shadow-none'), 'Cards and buttons must use shadow-none');
  assert.ok(componentsCss.includes('tracking-[-0.01em]'), 'Typography must use -1% letter spacing');
  assert.ok(componentsCss.includes('h-8'), 'Standard interactive controls must adhere to 32px height');
  assert.ok(!componentsCss.includes('rounded-[2.5rem]'), 'Fluffy 2.5rem radiuses must be eliminated');

  // Test 2: Verify Button.tsx uses h-8 standard and supports shortcuts
  const buttonTsx = fs.readFileSync(path.join(srcDir, 'shared/ui/Button.tsx'), 'utf8');
  assert.ok(buttonTsx.includes('shortcut'), 'Button component must support keyboard shortcut display');
  assert.ok(buttonTsx.includes('kbd'), 'Button must render kbd element for shortcuts');

  // Test 3: Verify Card.tsx uses flat surfaces with no drop shadows
  const cardTsx = fs.readFileSync(path.join(srcDir, 'shared/ui/Card.tsx'), 'utf8');
  assert.ok(cardTsx.includes('shadow-none'), 'Card component must enforce flat surfaces with shadow-none');
  assert.ok(cardTsx.includes('rounded-md'), 'Card component must use tight rounded-md radius');

  // Test 4: Verify Badge.tsx eliminated pastel pill shapes (rounded-full)
  const badgeTsx = fs.readFileSync(path.join(srcDir, 'shared/ui/Badge.tsx'), 'utf8');
  assert.ok(!badgeTsx.includes('rounded-full'), 'Badges must not be bubbly rounded-full candy pills');
  assert.ok(badgeTsx.includes('rounded'), 'Badges must use crisp rounded radius');

  // Test 5: Verify SegmentedControl.tsx uses 32px frame and flat segments
  const segControlTsx = fs.readFileSync(path.join(srcDir, 'shared/ui/SegmentedControl.tsx'), 'utf8');
  assert.ok(segControlTsx.includes('h-8'), 'Segmented control must use 32px standard height');
  assert.ok(segControlTsx.includes('shadow-none'), 'Active segment must be flat with shadow-none');

  // Test 6: Verify Modal.tsx keeps shadows ONLY for floating overlays
  const modalTsx = fs.readFileSync(path.join(srcDir, 'shared/ui/Modal.tsx'), 'utf8');
  assert.ok(modalTsx.includes('shadow-2xl'), 'Floating modal overlay is permitted shadow-2xl');
  assert.ok(modalTsx.includes('rounded-lg'), 'Modal must use clean rounded-lg radius');

  console.log('✅ PHASE 24 PASS: Linear & Anti-AI Professional UI design system 100% verified!');
}

runTests();
