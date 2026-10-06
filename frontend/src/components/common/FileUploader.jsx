import React, { useState, useRef } from 'react';
import { UploadCloud, X, Film, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from './Button';

export function FileUploader({ value, onChange, onClear }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];

  const handleFile = async (file) => {
    setError('');
    if (!file) return;

    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported format. Please upload JPG, PNG, WEBP, MP4, or MOV.`);
      return;
    }

    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov'].includes(ext);
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(`File size exceeds limit (${isVideo ? '100MB for video' : '10MB for image'}).`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('media', file);

      const res = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      const mediaUrl = res.mediaUrl || res.data?.mediaUrl || res.data?.url;
      const mediaType = (res.mediaType || res.data?.mediaType || (isVideo ? 'VIDEO' : 'IMAGE')).toUpperCase();
      const originalName = res.originalName || res.data?.originalName || file.name;

      if (mediaUrl) {
        onChange({
          url: mediaUrl,
          mediaType: mediaType,
          filename: originalName
        });
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
    onClear?.();
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {value?.url ? (
        /* Preview with remove button */
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
          {value.mediaType === 'VIDEO' || /\.(mp4|mov)$/i.test(value.url) ? (
            <video
              src={value.url}
              controls
              className="w-full max-h-72 object-contain bg-black"
            />
          ) : (
            <img
              src={value.url}
              alt="Uploaded media preview"
              className="w-full max-h-72 object-contain bg-slate-950/20"
            />
          )}

          <div className="absolute top-3 right-3">
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-all shadow-md"
              title="Remove media"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {value.mediaType === 'VIDEO' || /\.(mp4|mov)$/i.test(value.url) ? (
                <Film className="w-4 h-4 text-brand-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-brand-600" />
              )}
              <span className="font-medium text-slate-700">{value.filename || 'Attached media'}</span>
            </div>
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Ready
            </span>
          </div>
        </div>
      ) : (
        /* Dropzone area */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-50/50 scale-[0.99]'
              : 'border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            {uploading ? (
              <div className="w-full max-w-xs space-y-2">
                <p className="text-sm font-semibold text-brand-600">Uploading media to server...</p>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">
                  <span className="text-brand-600 hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPG, JPEG, PNG, WEBP (up to 10MB) or MP4, MOV (up to 100MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
