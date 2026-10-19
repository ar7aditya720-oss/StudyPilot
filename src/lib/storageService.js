import { supabase } from './supabase';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const BUCKET_NAME = 'study-documents';

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
  '.csv',
  '.xlsx',
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Format bytes to readable size string
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Validates file type and size
 */
export function validateFile(file) {
  if (!file) return { valid: false, error: 'No file provided.' };

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 10MB size limit (${formatFileSize(file.size)}).`,
    };
  }

  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = file.type ? ALLOWED_MIME_TYPES.includes(file.type) : true;

  if (!hasValidExt) {
    return {
      valid: false,
      error: `File "${file.name}" has an unsupported format. Supported formats: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG.`,
    };
  }

  return { valid: true };
}

/**
 * Fetch list of uploaded study documents for the authenticated user
 */
export async function fetchUploadedFiles(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    throw new Error(error.message || 'Failed to fetch uploaded files.');
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.original_filename,
    storagePath: row.storage_path,
    size: Number(row.size_bytes),
    mimeType: row.mime_type,
    createdAt: row.created_at,
    status: row.status,
  }));
}

/**
 * Upload a file to private Supabase Storage and record its metadata in PostgreSQL
 */
export async function uploadStudyDocument(file, userId) {
  if (!supabase || !userId) throw new Error('Not authenticated.');

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${Date.now()}_${cleanName}`;

  // 1. Upload to Supabase Storage private bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 2. Insert metadata into public.uploaded_files
  const { data, error: dbError } = await supabase
    .from('uploaded_files')
    .insert([
      {
        user_id: userId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        status: 'uploaded',
      },
    ])
    .select()
    .single();

  if (dbError) {
    console.error('File metadata insert error:', dbError);
    // Cleanup orphaned storage object if DB insert failed
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save file metadata: ${dbError.message}`);
  }

  return {
    id: data.id,
    name: data.original_filename,
    storagePath: data.storage_path,
    size: Number(data.size_bytes),
    mimeType: data.mime_type,
    createdAt: data.created_at,
    status: data.status,
  };
}

/**
 * Download a file by generating a short-lived signed URL
 */
export async function downloadStudyDocument(storagePath, originalFilename) {
  if (!supabase || !storagePath) throw new Error('Storage path required.');

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 60, {
      download: originalFilename || true,
    });

  if (error || !data?.signedUrl) {
    console.error('Signed URL generation failed:', error);
    throw new Error('Could not generate download link: ' + (error?.message || 'Access denied'));
  }

  // Trigger download via temporary anchor
  const a = document.createElement('a');
  a.href = data.signedUrl;
  a.download = originalFilename || 'study-document';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Delete a file from both Supabase Storage and the metadata table
 */
export async function deleteStudyDocument(fileId, storagePath, userId) {
  if (!supabase || !fileId || !userId) throw new Error('Missing file deletion parameters.');

  // 1. Delete object from Storage bucket
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (storageError) {
      console.warn('Storage object deletion warning:', storageError.message);
    }
  }

  // 2. Delete metadata row from DB
  const { error: dbError } = await supabase
    .from('uploaded_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId);

  if (dbError) {
    console.error('File metadata deletion error:', dbError);
    throw new Error(dbError.message || 'Failed to remove file record.');
  }

  return true;
}
