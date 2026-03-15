import apiClient from './apiClient';

export type ComplaintStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';

export interface CreateComplaintPayload {
  rollNumber: string;
  roomNumber: string;
  category: string;
  description: string;
  photoUrl: string;
  title?: string;
  voiceTranscript?: string;
  qrCodeId?: string;
}

export const createComplaint = async (payload: CreateComplaintPayload) => {
  const { data } = await apiClient.post('/complaints/create', payload);
  return data;
};

export const fetchUserComplaints = async () => {
  const { data } = await apiClient.get('/student/complaints');
  return data;
};

export const fetchComplaintsByRollNumber = async (rollNumber: string) => {
  const { data } = await apiClient.get(`/complaints/user/${encodeURIComponent(rollNumber)}`);
  return data;
};

export const fetchAllComplaints = async (filters?: { status?: string; category?: string }) => {
  const { data } = await apiClient.get('/admin/complaints', { params: filters });
  return data;
};

export const updateComplaintStatus = async (complaintId: string, status: ComplaintStatus, note?: string) => {
  const { data } = await apiClient.put(`/complaints/update-status/${complaintId}`, { status, note });
  return data;
};

export const assignWorkerToComplaint = async (complaintId: string, workerId: string) => {
  const { data } = await apiClient.put(`/complaints/assign-worker/${complaintId}`, { workerId });
  return data;
};

export const fetchWorkerAssignments = async (workerId?: string) => {
  const params = workerId ? { workerId } : undefined;
  if (workerId) {
    const { data } = await apiClient.get('/complaints/assigned', { params });
    return data;
  }
  const { data } = await apiClient.get('/worker/tasks');
  return data;
};
