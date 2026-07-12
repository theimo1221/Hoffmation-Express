// Clean the coverage cache once before the WebUI E2E run.
import { coverageReport } from './mcr';

export default async function globalSetup(): Promise<void> {
  await coverageReport.cleanCache();
}
