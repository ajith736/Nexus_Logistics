import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadsApi } from '@/api/uploads.api';
import { useSocket } from '@/hooks/useSocket';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, downloadBlob } from '@/lib/utils';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  CloudUpload,
} from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function validateFile(file) {
  if (!file) return 'No file selected.';
  if (!file.name.toLowerCase().endsWith('.csv')) return 'Only CSV files are allowed.';
  if (file.size > 10 * 1024 * 1024) return 'File must be smaller than 10 MB.';
  return '';
}

export default function UploadsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [activeJob, setActiveJob] = useState(null);

  // Keep a stable ref so socket handlers don't need to re-subscribe on every state change
  const activeJobRef = useRef(activeJob);
  useEffect(() => {
    activeJobRef.current = activeJob;
  }, [activeJob]);

  const downloadSampleMutation = useMutation({
    mutationFn: () => uploadsApi.downloadSample(),
    onSuccess: (res) => {
      downloadBlob(res.data, 'sample-orders.csv');
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => uploadsApi.list({ page: 1, limit: 50 }).then((r) => r.data.data),
  });

  const uploads = data?.docs ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file) =>
      uploadsApi.uploadCsv(file, (evt) => {
        if (evt.total) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setActiveJob((prev) => (prev ? { ...prev, httpProgress: pct } : prev));
        }
      }),
    onMutate: (file) => {
      setActiveJob({
        jobId: null,
        fileName: file.name,
        httpProgress: 0,
        processingProgress: 0,
        status: 'uploading',
      });
    },
    onSuccess: (res) => {
      const { jobId } = res.data.data;
      setActiveJob((prev) => ({
        ...prev,
        jobId,
        httpProgress: 100,
        status: 'processing',
      }));
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
    onError: () => {
      setActiveJob((prev) => (prev ? { ...prev, status: 'error' } : prev));
    },
  });

  // Stable socket handlers that read from ref to avoid re-subscription churn
  const handleProgress = useCallback((data) => {
    const job = activeJobRef.current;
    if (!job || job.jobId !== data.jobId) return;
    const pct = data.total ? Math.round((data.processed / data.total) * 100) : 0;
    setActiveJob((prev) => (prev ? { ...prev, processingProgress: pct } : prev));
  }, []);

  const handleComplete = useCallback(
    (data) => {
      const job = activeJobRef.current;
      if (!job || job.jobId !== data.jobId) return;
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              processingProgress: 100,
              status: 'complete',
              successCount: data.successCount,
              failCount: data.failCount,
              errorFileUrl: data.errorFileUrl,
            }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
    [queryClient]
  );

  useSocket('upload:progress', handleProgress);
  useSocket('upload:complete', handleComplete);

  // Drag & drop handlers
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateFile(file);
    setFileError(err);
    if (!err) setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    setFileError(err);
    if (!err) setSelectedFile(file);
    e.target.value = '';
  };

  const handleUpload = () => {
    if (selectedFile && !uploadMutation.isPending) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFileError('');
  };

  const columns = [
    {
      key: 'originalName',
      header: 'File',
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
          <span
            className="font-medium text-gray-800 truncate max-w-[200px]"
            title={row.originalName}
          >
            {row.originalName}
          </span>
        </div>
      ),
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded By',
      render: (row) => (
        <span className="text-gray-600">{row.uploadedBy?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'totalRows',
      header: 'Total',
      render: (row) => (
        <span className="text-gray-600">{row.totalRows ?? '—'}</span>
      ),
    },
    {
      key: 'successCount',
      header: 'Created',
      render: (row) => (
        <span className="text-green-700 font-semibold">{row.successCount ?? 0}</span>
      ),
    },
    {
      key: 'failCount',
      header: 'Failed',
      render: (row) => (
        <span
          className={
            row.failCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'
          }
        >
          {row.failCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded At',
      render: (row) => (
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.errorFileUrl ? (
          <a
            href={row.errorFileUrl}
            download
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:underline font-medium whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3.5 w-3.5" />
            Error CSV
          </a>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <PageHeader
          title="Bulk Uploads"
          description="Upload a CSV file to create multiple orders at once"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={downloadSampleMutation.isPending}
          onClick={() => downloadSampleMutation.mutate()}
          className="shrink-0"
        >
          <Download className="h-4 w-4" />
          {downloadSampleMutation.isPending ? 'Downloading…' : 'Sample CSV'}
        </Button>
      </div>

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors',
              selectedFile
                ? 'border-blue-300 bg-blue-50/40 cursor-default'
                : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50',
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            )}
          >
            <CloudUpload
              className={cn(
                'h-10 w-10 transition-colors',
                isDragging ? 'text-blue-500' : 'text-gray-400'
              )}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
              </p>
              {!selectedFile && (
                <p className="text-xs text-gray-500 mt-1">
                  or{' '}
                  <span className="text-blue-600 font-semibold hover:underline">
                    browse to select
                  </span>{' '}
                  — CSV only, max 10 MB
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {fileError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
              <XCircle className="h-4 w-4 shrink-0" />
              {fileError}
            </p>
          )}

          {selectedFile && !fileError && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium truncate">{selectedFile.name}</span>
                <span className="text-gray-400 shrink-0">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearFile}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  disabled={uploadMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active upload progress */}
      {activeJob &&
        activeJob.status !== 'complete' &&
        activeJob.status !== 'error' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
                {activeJob.status === 'uploading' ? 'Uploading' : 'Processing'}:{' '}
                {activeJob.fileName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Upload to server</span>
                  <span>{activeJob.httpProgress}%</span>
                </div>
                <Progress value={activeJob.httpProgress} />
              </div>
              {activeJob.status === 'processing' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Processing rows</span>
                    <span>{activeJob.processingProgress}%</span>
                  </div>
                  <Progress
                    value={activeJob.processingProgress}
                    className="[&>div]:bg-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Creating orders… this may take a moment for large files.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Completion banner */}
      {activeJob?.status === 'complete' && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Upload complete!</p>
              <p className="text-green-700 mt-0.5">
                {activeJob.successCount} order
                {activeJob.successCount !== 1 ? 's' : ''} created
                {activeJob.failCount > 0 && (
                  <>, {activeJob.failCount} row{activeJob.failCount !== 1 ? 's' : ''} failed</>
                )}
                .
              </p>
              {activeJob.errorFileUrl && (
                <a
                  href={activeJob.errorFileUrl}
                  download
                  className="mt-1 inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:underline font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download error report
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setActiveJob(null)}
            className="text-green-600 hover:text-green-800 shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {activeJob?.status === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold">Upload failed.</p>
              <p className="text-red-700">Please check your file and try again.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveJob(null)}
            className="text-red-600 hover:text-red-800 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload history */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload History</h2>
        <DataTable
          columns={columns}
          data={uploads}
          isLoading={isLoading}
          emptyMessage="No uploads yet. Upload a CSV file to get started."
        />
      </div>
    </div>
  );
}
