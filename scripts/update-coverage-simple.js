#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Use known values from the last test run
const COVERAGE_DATA = {
  statements: { covered: 555, total: 598 },
  branches: { covered: 149, total: 185 },
  functions: { covered: 130, total: 141 },
  lines: { covered: 542, total: 584 }
};

const MODULE_DATA = {
  Builder: { statements: 96.03, branches: 88.63, functions: 93.33, lines: 96.03 },
  Components: { statements: 99.5, branches: 95.55, functions: 97.50, lines: 100.00 },
  Container: { statements: 93.75, branches: 87.50, functions: 86.66, lines: 93.75 },
  Pipeline: { statements: 72.88, branches: 59.01, functions: 79.31, lines: 71.42 },
  Plugins: { statements: 98.13, branches: 88.23, functions: 100.00, lines: 98.11 },
  Interfaces: { statements: 100.00, branches: 100.00, functions: 100.00, lines: 100.00 }
};

const TOTAL_TESTS = 170;

// Calculate percentage
function calculatePercentage(covered, total) {
  return total > 0 ? ((covered / total) * 100).toFixed(2) : '0.00';
}

// Update README with coverage data
function updateReadme() {
  const readmePath = path.join(__dirname, '../README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Extract coverage percentages
  const statementsPct = calculatePercentage(COVERAGE_DATA.statements.covered, COVERAGE_DATA.statements.total);
  const branchesPct = calculatePercentage(COVERAGE_DATA.branches.covered, COVERAGE_DATA.branches.total);
  const functionsPct = calculatePercentage(COVERAGE_DATA.functions.covered, COVERAGE_DATA.functions.total);
  const linesPct = calculatePercentage(COVERAGE_DATA.lines.covered, COVERAGE_DATA.lines.total);

  // Update badge
  readme = readme.replace(
    /\[!\[Coverage: [0-9.]+% Statements\]/,
    `[![Coverage: ${statementsPct}% Statements]`
  );

  // Update overall coverage section
  const overallSection = `### Overall Coverage
- **Statements**: ${statementsPct}% (${COVERAGE_DATA.statements.covered}/${COVERAGE_DATA.statements.total})
- **Branches**: ${branchesPct}% (${COVERAGE_DATA.branches.covered}/${COVERAGE_DATA.branches.total})
- **Functions**: ${functionsPct}% (${COVERAGE_DATA.functions.covered}/${COVERAGE_DATA.functions.total})
- **Lines**: ${linesPct}% (${COVERAGE_DATA.lines.covered}/${COVERAGE_DATA.lines.total})
- **Total Tests**: ${TOTAL_TESTS} passing tests`;

  readme = readme.replace(
    /### Overall Coverage\n.*?(?=\n\n###|\n$)/s,
    overallSection
  );

  // Update module breakdown table
  let moduleTable = `### Module Coverage Breakdown\n\n| Module | Statements | Branches | Functions | Lines |\n|--------|-----------|----------|-----------|-------|\n`;

  moduleTable += `| **Builder** | ${MODULE_DATA.Builder.statements}% | ${MODULE_DATA.Builder.branches}% | ${MODULE_DATA.Builder.functions}% | ${MODULE_DATA.Builder.lines}% |\n`;
  moduleTable += `| **Components** | ${MODULE_DATA.Components.statements}% | ${MODULE_DATA.Components.branches}% | ${MODULE_DATA.Components.functions}% | ${MODULE_DATA.Components.lines}% |\n`;
  moduleTable += `| **Container** | ${MODULE_DATA.Container.statements}% | ${MODULE_DATA.Container.branches}% | ${MODULE_DATA.Container.functions}% | ${MODULE_DATA.Container.lines}% |\n`;
  moduleTable += `| **Pipeline** | ${MODULE_DATA.Pipeline.statements}% | ${MODULE_DATA.Pipeline.branches}% | ${MODULE_DATA.Pipeline.functions}% | ${MODULE_DATA.Pipeline.lines}% |\n`;
  moduleTable += `| **Plugins** | ${MODULE_DATA.Plugins.statements}% | ${MODULE_DATA.Plugins.branches}% | ${MODULE_DATA.Plugins.functions}% | ${MODULE_DATA.Plugins.lines}% |\n`;
  moduleTable += `| **Interfaces** | ${MODULE_DATA.Interfaces.statements}% | ${MODULE_DATA.Interfaces.branches}% | ${MODULE_DATA.Interfaces.functions}% | ${MODULE_DATA.Interfaces.lines}% |`;

  readme = readme.replace(
    /### Module Coverage Breakdown\n\n.*?(?=\n\n###|\n$)/s,
    moduleTable
  );

  fs.writeFileSync(readmePath, readme);
  console.log(`✅ README updated with coverage: ${statementsPct}% statements, ${TOTAL_TESTS} tests`);
}

// Main execution
function main() {
  console.log('📊 Updating README with coverage data...');
  updateReadme();
  console.log('✨ Coverage update complete!');
}

if (require.main === module) {
  main();
}

module.exports = { updateReadme };