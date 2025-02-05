import React from 'react';
import { Job } from '../jobs/Job';
import { Jobs } from '../services/JobQueue';

interface JobQueueProps {
  jobs: Job<any>[];
}

const JobQueue: React.FC<JobQueueProps> = ({ jobs }) => {
  const handleCancel = (jobId: string) => {
    Jobs.cancelJob(jobId);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-4">
      <h2 className="text-xl font-semibold text-white mb-4">Job Queue</h2>
      {jobs.length === 0 ? (
        <p className="text-gray-300">No active jobs</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-gray-700 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-white">{job.name}</h3>
                <button
                  onClick={() => handleCancel(job.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded"
                >
                  Cancel
                </button>
              </div>
              <p className="text-gray-300 text-sm mb-2">{job.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status: {job.status}</span>
                {job.currentProgress && (
                  <span className="text-gray-400">
                    Progress: {job.currentProgress.current} / {job.currentProgress.total}
                  </span>
                )}
              </div>
              {job.currentProgress && (
                <div className="mt-2 bg-gray-600 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${(job.currentProgress.current / job.currentProgress.total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobQueue;
