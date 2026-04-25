import api from './axios';

export const uploadsApi = {
  uploadCsv: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },

  list: (params) => api.get('/uploads', { params }),

  get: (id) => api.get(`/uploads/${id}`),

  downloadSample: () => api.get('/uploads/sample', { responseType: 'blob' }),
};
