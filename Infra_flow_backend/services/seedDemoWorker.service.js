import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Worker from '../models/worker.model.js';

const DEMO_WORKER = {
  name: 'Demo Worker',
  role: 'worker',
  mobileNumber: '1234567890',
  email: 'worker@test.com',
  password: '12345678',
  skills: ['plumbing'],
  department: 'mechanical',
};

export const seedDemoWorkerAccount = async () => {
  const existingWorker = await User.findOne({ role: 'worker', mobileNumber: DEMO_WORKER.mobileNumber });

  if (existingWorker) {
    const workerProfile = await Worker.findOne({ user: existingWorker._id });
    if (!workerProfile) {
      await Worker.create({
        user: existingWorker._id,
        skills: DEMO_WORKER.skills,
      });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_WORKER.password, 10);
  const user = await User.create({
    name: DEMO_WORKER.name,
    role: DEMO_WORKER.role,
    mobileNumber: DEMO_WORKER.mobileNumber,
    email: DEMO_WORKER.email,
    passwordHash,
    skills: DEMO_WORKER.skills,
    department: DEMO_WORKER.department,
  });

  await Worker.create({
    user: user._id,
    skills: DEMO_WORKER.skills,
  });
};
