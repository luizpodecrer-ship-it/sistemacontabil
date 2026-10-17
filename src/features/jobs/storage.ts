import { loadData, mutateData } from "../workspace/storage";
import { migrateCompanyJobs } from "./model";
export async function loadJobsData() {
  const data = await loadData();
  if (!data.items.some((i) => i.module === "jobs" && i.companyId)) return data;
  return mutateData(migrateCompanyJobs);
}
