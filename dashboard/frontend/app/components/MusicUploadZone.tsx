'use client';

/**
 * Music Upload Zone Component
 *
 * Drag-and-drop interface for uploading voice memos and notes.
 * Shows upload progress and processing status.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  File,
  Music,
  FileText,
  Image,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mic,
  FileAudio,
} from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'analyzing' | 'composing' | 'completed' | 'error';
  progress: number;
  error?: string;
  songId?: string;
}

interface MusicUploadZoneProps {
  apiUrl?: string;
  onUploadComplete?: (songId: string) => void;
  className?: string;
}

export default function MusicUploadZone({
  apiUrl = 'http://localhost:4000',
  onUploadComplete,
  className = '',
}: MusicUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  // Process selected files
  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => {
      // Accept audio files and text files
      return (
        file.type.startsWith('audio/') ||
        file.type === 'text/plain' ||
        file.type === 'application/octet-stream' // for .m4a files
      );
    });

    if (validFiles.length === 0) {
      alert('Please upload audio files (MP3, M4A, WAV) or text notes');
      return;
    }

    // Create upload entries
    const newUploads: UploadFile[] = validFiles.map((file) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploading
    for (const upload of newUploads) {
      await uploadFile(upload);
    }
  };

  // Upload file to API
  const uploadFile = async (upload: UploadFile) => {
    try {
      // Update status to uploading
      updateUploadStatus(upload.id, { status: 'uploading', progress: 0 });

      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('userId', 'demo-user'); // Would come from auth in real app

      // Upload file
      const response = await fetch(`${apiUrl}/api/v1/music/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const uploadId = result.data.id;

      // Update status to processing
      updateUploadStatus(upload.id, { status: 'processing', progress: 30 });

      // Poll for status updates
      await pollUploadStatus(upload.id, uploadId);
    } catch (error: any) {
      console.error('Upload error:', error);
      updateUploadStatus(upload.id, {
        status: 'error',
        error: error.message || 'Upload failed',
      });
    }
  };

  // Poll upload status
  const pollUploadStatus = async (uploadId: string, apiUploadId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`${apiUrl}/api/v1/music/upload/${apiUploadId}/status`, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get status');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Status check failed');
        }

        const status = result.data.status;

        // Update UI based on status
        if (status === 'processing') {
          updateUploadStatus(uploadId, { status: 'processing', progress: 40 });
        } else if (status === 'analyzed') {
          updateUploadStatus(uploadId, { status: 'analyzing', progress: 60 });
        } else if (status === 'composing') {
          updateUploadStatus(uploadId, { status: 'composing', progress: 80 });
        } else if (status === 'completed') {
          updateUploadStatus(uploadId, {
            status: 'completed',
            progress: 100,
            songId: result.data.songId,
          });

          if (onUploadComplete && result.data.songId) {
            onUploadComplete(result.data.songId);
          }

          return; // Stop polling
        } else if (status === 'failed') {
          throw new Error(result.data.error || 'Processing failed');
        }

        // Continue polling if not complete
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          throw new Error('Processing timeout');
        }
      } catch (error: any) {
        console.error('Status poll error:', error);
        updateUploadStatus(uploadId, {
          status: 'error',
          error: error.message || 'Processing failed',
        });
      }
    };

    // Start polling
    setTimeout(poll, 2000); // Wait 2 seconds before first poll
  };

  // Update upload status
  const updateUploadStatus = (
    uploadId: string,
    updates: Partial<Omit<UploadFile, 'id' | 'file'>>
  ) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === uploadId ? { ...upload, ...updates } : upload
      )
    );
  };

  // Remove upload
  const removeUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
  };

  // Get icon for file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) {
      return <FileAudio className="w-8 h-8 text-jarvis-primary" />;
    } else if (file.type === 'text/plain') {
      return <FileText className="w-8 h-8 text-jarvis-secondary" />;
    } else {
      return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  // Get status text
  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing vocals...';
      case 'analyzing':
        return 'Analyzing musical intent...';
      case 'composing':
        return 'Composing song...';
      case 'completed':
        return 'Complete!';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <div className={className}>
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-12 transition-all cursor-pointer ${
          isDragging
            ? 'border-jarvis-primary bg-jarvis-primary/10'
            : 'border-jarvis-primary/30 hover:border-jarvis-primary/50 hover:bg-jarvis-primary/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.m4a,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-jarvis-primary/20 mb-4">
            {isDragging ? (
              <Upload className="w-8 h-8 text-jarvis-primary animate-bounce" />
            ) : (
              <Mic className="w-8 h-8 text-jarvis-primary" />
            )}
          </div>

          <h3 className="text-xl font-bold mb-2">
            {isDragging ? 'Drop files here' : 'Upload Voice Memos & Notes'}
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop files or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports: MP3, M4A, WAV, TXT • Max 50MB per file
          </p>

          <button className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white font-semibold hover:opacity-90 transition-opacity">
            Select Files
          </button>
        </div>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">
              Uploads ({uploads.filter((u) => u.status !== 'completed' && u.status !== 'error').length})
            </h4>
            <button
              onClick={() => setUploads(uploads.filter((u) => u.status === 'completed' || u.status === 'error'))}
              className="text-sm text-jarvis-primary hover:underline"
            >
              Clear Completed
            </button>
          </div>

          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="glass rounded-lg p-4 border border-jarvis-primary/20"
            >
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0">{getFileIcon(upload.file)}</div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold truncate">{upload.file.name}</h5>
                      <p className="text-sm text-gray-400">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {upload.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-jarvis-success" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-jarvis-danger" />
                      )}
                      {['pending', 'uploading', 'processing', 'analyzing', 'composing'].includes(
                        upload.status
                      ) && <Loader2 className="w-5 h-5 text-jarvis-primary animate-spin" />}
                    </div>

                    {/* Remove Button */}
                    {(upload.status === 'completed' || upload.status === 'error') && (
                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="flex-shrink-0 p-1 rounded hover:bg-jarvis-primary/10 text-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {upload.status !== 'completed' && upload.status !== 'error' && (
                    <div className="mb-2">
                      <div className="h-2 bg-jarvis-primary/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-jarvis-primary to-jarvis-secondary transition-all duration-500"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Text */}
                  <p
                    className={`text-sm ${
                      upload.status === 'error'
                        ? 'text-jarvis-danger'
                        : upload.status === 'completed'
                        ? 'text-jarvis-success'
                        : 'text-gray-400'
                    }`}
                  >
                    {upload.error || getStatusText(upload.status)}
                  </p>

                  {/* Completed - Show Song */}
                  {upload.status === 'completed' && upload.songId && (
                    <button
                      onClick={() => {
                        /* Navigate to song */
                      }}
                      className="mt-2 text-sm text-jarvis-primary hover:underline"
                    >
                      View Song →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
