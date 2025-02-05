import { Job } from "../jobs/Job";

export class JobQueue {
  private runningJobs: Map<string, Job<any>> = new Map();

  async start<T>(job: Job<T>) {
    if (this.runningJobs.has(job.id)) {
      throw new Error(`Job with id ${job.id} is already running`);
      return;
    }

    this.runningJobs.set(job.id, job);
    try {
      const data = await job.start();
      this.runningJobs.delete(job.id);
      return data;
    } catch (error) {
      console.error("Job failed", error);
      this.runningJobs.delete(job.id);
      throw error;
    }
  }

  cancelJob(jobId: string) {
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      runningJob.cancel();
      this.runningJobs.delete(jobId);
    }
  }

  getRunningJobs(): Job<any>[] {
    return Array.from(this.runningJobs.values());
  }
}

export const Jobs = new JobQueue();
