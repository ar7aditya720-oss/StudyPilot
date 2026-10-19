import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  formatFileSize,
  uploadStudyDocument,
  downloadStudyDocument,
  deleteStudyDocument,
  ALLOWED_EXTENSIONS,
} from '../lib/storageService';

export function DocumentManager({
  files = [],
  setFiles,
  userId,
  notify,
  isOfflineMode = false,
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFiles = async (fileList) => {
    setUploadError('');
    const rawFiles = Array.from(fileList || []);
    if (!rawFiles.length) return;

    if (isOfflineMode || !userId) {
      // Local fallback queue
      const mockList = rawFiles.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        createdAt: new Date().toISOString(),
      }));
      setFiles((prev) => [...mockList, ...prev]);
      notify('Files added locally (offline mode). Connect Supabase for private cloud storage.');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const file of rawFiles) {
      try {
        const uploaded = await uploadStudyDocument(file, userId);
        setFiles((prev) => [uploaded, ...prev]);
        successCount++;
      } catch (err) {
        console.error('File upload failed:', err);
        setUploadError(err.message || 'Upload failed for ' + file.name);
        notify(err.message || 'Upload failed for ' + file.name);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      notify(`Uploaded ${successCount} document${successCount > 1 ? 's' : ''} to private cloud storage.`);
    }
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file.id);
      if (file.storagePath) {
        await downloadStudyDocument(file.storagePath, file.name);
        notify('Download started.');
      } else {
        notify('Local preview file cannot be downloaded without cloud storage.');
      }
    } catch (err) {
      console.error('Download failed:', err);
      notify('Download failed: ' + (err.message || 'Could not fetch file.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(file.id);
      if (!isOfflineMode && userId && file.storagePath) {
        await deleteStudyDocument(file.id, file.storagePath, userId);
      }
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      notify('Document deleted.');
    } catch (err) {
      console.error('Delete failed:', err);
      notify('Failed to delete file: ' + (err.message || 'Access denied'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="panel upload">
      <div className="panel-head">
        <div>
          <div className="kicker">DOCUMENTS</div>
          <h3>Bring in your work</h3>
          <p>Timetable, assignments, homework and reports.</p>
        </div>
        <div className="mini-icon blue">
          <UploadCloud size={18} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleFileChange}
      />

      <button
        type="button"
        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        disabled={isUploading}
      >
        <div className="upload-icon">
          {isUploading ? <Loader2 size={21} className="spin-icon" /> : <UploadCloud size={21} />}
        </div>
        <b>{isUploading ? 'Uploading to private storage...' : 'Click or drag documents here'}</b>
        <span>PDF, DOCX, images, TXT or CSV (max 10MB)</span>
        <small>Private cloud storage · Scoped exclusively to your account</small>
      </button>

      {uploadError && (
        <div className="upload-inline-error">
          <AlertCircle size={13} />
          <span>{uploadError}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="upload-list-enhanced">
          {files.map((f) => (
            <div key={f.id || f.name} className="doc-item">
              <div className="doc-icon-wrap">
                <FileText size={15} />
              </div>
              <div className="doc-info">
                <span className="doc-title" title={f.name}>
                  {f.name}
                </span>
                <span className="doc-meta">
                  {formatFileSize(f.size)}
                  {f.createdAt ? ` · ${new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </span>
              </div>
              <div className="doc-actions">
                <button
                  type="button"
                  className="doc-action-btn"
                  title="Download file"
                  onClick={() => handleDownload(f)}
                  disabled={downloadingId === f.id}
                >
                  {downloadingId === f.id ? (
                    <Loader2 size={13} className="spin-icon" />
                  ) : (
                    <Download size={13} />
                  )}
                </button>
                <button
                  type="button"
                  className="doc-action-btn danger"
                  title="Delete file"
                  onClick={() => handleDelete(f)}
                  disabled={deletingId === f.id}
                >
                  {deletingId === f.id ? (
                    <Loader2 size={13} className="spin-icon" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
