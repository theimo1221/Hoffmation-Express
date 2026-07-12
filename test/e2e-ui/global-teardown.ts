// Generate the WebUI coverage report (coverage/ui/lcov.info) after all E2E tests have run.
import { coverageReport } from './mcr';

export default async function globalTeardown(): Promise<void> {
  await coverageReport.generate();
}
