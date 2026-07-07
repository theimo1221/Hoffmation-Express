// Shared Monocart Coverage Reports instance for the WebUI E2E run.
// Workers add per-test V8 coverage to the on-disk cache; the global teardown generates the report.
import { CoverageReport } from 'monocart-coverage-reports';

export const coverageReport = new CoverageReport({
  name: 'WebUI E2E coverage',
  outputDir: 'coverage/ui',
  // lcovonly so it can be merged with the backend (vitest) lcov into one combined report.
  reports: [['lcovonly', { file: 'lcov.info' }], ['console-summary']],
  // Only the WebUI sources; the Express backend is covered by the vitest suite.
  sourceFilter: (sourcePath: string) => sourcePath.includes('webui/src/') && !sourcePath.includes('node_modules'),
  cleanCache: false,
});
