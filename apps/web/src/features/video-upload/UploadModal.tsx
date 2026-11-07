import React, { useState, useRef } from 'react';
import { Upload, X, Film, ShieldCheck, FileVideo } from 'lucide-react';
import { api } from '../../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rightsStatus, setRightsStatus] = useState('PENDING_REVIEW');
  const [licenseNote, setLicenseNote] = useState('');
  const [authorConsent, setAuthorConsent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(f.name)
      );
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert('Vui lòng chọn ít nhất một tệp video');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('videos', file);
      });
      formData.append('rightsStatus', rightsStatus);
      if (licenseNote) formData.append('licenseNote', licenseNote);
      formData.append('authorConsent', authorConsent ? 'true' : 'false');

      const result = await api.uploadVideos(formData);
      alert(
        `Nạp thành công ${result.uploadedCount} video! ${
          result.duplicateCount > 0 ? `Bỏ qua ${result.duplicateCount} video trùng lặp.` : ''
        }`
      );
      setSelectedFiles([]);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      alert(`Lỗi tải lên: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tải Video Lên Thư Viện (Manual Upload)</h2>
              <p className="text-xs text-slate-400">Hỗ trợ MP4, MOV, WebM, MKV — Trích xuất metadata & thumbnail tự động</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-teal-400 bg-teal-500/10'
                : 'border-slate-700 bg-slate-950/60 hover:border-teal-500/50 hover:bg-slate-900'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
              className="hidden"
            />
            <FileVideo className="w-8 h-8 sm:w-10 sm:h-10 text-teal-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-200">
              Kéo thả các video vào đây hoặc <span className="text-teal-400 underline">chọn tệp từ máy tính</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ nạp cùng lúc nhiều video (Tối đa 500MB/file)
            </div>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span>Đã chọn {selectedFiles.length} tệp video:</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-rose-400 hover:underline text-[11px]"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Film className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate text-slate-200 text-xs">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rights & Licensing Section */}
          <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Xác minh Quyền sử dụng & Bản quyền (Rights Management)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Trạng thái quyền sử dụng:</label>
                <select
                  value={rightsStatus}
                  onChange={(e) => setRightsStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
                >
                  <option value="PENDING_REVIEW">Chờ kiểm duyệt bản quyền (PENDING_REVIEW)</option>
                  <option value="AUTHORIZED">Đã có sự cho phép của tác giả (AUTHORIZED)</option>
                  <option value="LICENSED">Có giấy phép sử dụng hợp pháp (LICENSED)</option>
                  <option value="PUBLIC_DOMAIN">Phạm vi công cộng / Miễn bản quyền (PUBLIC_DOMAIN)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Ghi chú chứng từ / License note:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giấy đồng ý của cosplayer, tin nhắn chấp thuận..."
                  value={licenseNote}
                  onChange={(e) => setLicenseNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorConsent}
                  onChange={(e) => setAuthorConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
                />
                <span className="text-slate-300 text-[11px] leading-tight">
                  Tôi xác nhận các video này đã được kiểm tra tính hợp pháp hoặc có sự đồng ý của chủ sở hữu trước khi xuất bản lên Reels.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium text-center"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-50 text-center"
            >
              {isUploading ? 'Đang nạp video & trích xuất...' : `Tải lên ${selectedFiles.length} video`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
