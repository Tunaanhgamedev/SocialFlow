import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, X, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface RightsModalProps {
  isOpen: boolean;
  video: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const RightsModal: React.FC<RightsModalProps> = ({ isOpen, video, onClose, onSuccess }) => {
  const [rightsStatus, setRightsStatus] = useState('PENDING_REVIEW');
  const [licenseDocument, setLicenseDocument] = useState('');
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');
  const [authorConsent, setAuthorConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (video) {
      setRightsStatus(video.rightsStatus || video.rights?.rightsStatus || 'PENDING_REVIEW');
      setLicenseDocument(video.rights?.licenseDocument || '');
      setEvidence(video.rights?.evidence || '');
      setNotes(video.rights?.notes || '');
      setAuthorConsent(video.rights?.authorConsent || false);
    }
  }, [video]);

  if (!isOpen || !video) return null;

  const isEligible = rightsStatus === 'AUTHORIZED' || rightsStatus === 'LICENSED' || rightsStatus === 'PUBLIC_DOMAIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.updateRights(video.id, {
        rightsStatus,
        licenseDocument: licenseDocument || undefined,
        evidence: evidence || undefined,
        notes: notes || undefined,
        authorConsent
      });
      alert('Đã cập nhật trạng thái bản quyền thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Lỗi cập nhật: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-xl ${isEligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {isEligible ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Quản lý Bản quyền & Quyền Sử Dụng</h2>
              <p className="text-xs text-slate-400 truncate max-w-sm">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Eligibility Alert */}
          <div
            className={`p-3 rounded-xl border flex items-start space-x-2 text-xs leading-relaxed ${
              isEligible
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {isEligible ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block text-white mb-0.5">
                {isEligible ? 'Đủ điều kiện xuất bản (Publish Eligible)' : 'Chặn xuất bản (Blocked from Publishing)'}
              </strong>
              {isEligible
                ? 'Video có quyền sử dụng hợp lệ. Có thể chuyển sang bước AI Metadata, Duyệt và Xuất bản lên Reels.'
                : 'Video chưa xác minh hoặc bị cấm. Hệ thống sẽ chặn các lệnh xếp lịch đăng Reels cho đến khi quyền được phê chuẩn.'}
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Trạng thái quyền (Rights Status): *</label>
            <select
              value={rightsStatus}
              onChange={(e) => setRightsStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            >
              <option value="AUTHORIZED">AUTHORIZED – Đã có sự cho phép từ chủ sở hữu</option>
              <option value="LICENSED">LICENSED – Có giấy phép sử dụng hợp pháp</option>
              <option value="PUBLIC_DOMAIN">PUBLIC_DOMAIN – Phạm vi công cộng / Miễn bản quyền</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW – Chưa xác minh / Đang chờ duyệt</option>
              <option value="PROHIBITED">PROHIBITED – Không được phép sử dụng (Chặn đăng)</option>
              <option value="REVOKED">REVOKED – Bị thu hồi quyền sử dụng</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Bằng chứng cấp quyền / Thỏa thuận (Evidence):</label>
            <input
              type="text"
              placeholder="Ví dụ: Link tin nhắn trao đổi, email xác nhận, ảnh chụp sự đồng ý..."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Mã hợp đồng / Giấy phép (License Document):</label>
            <input
              type="text"
              placeholder="Ví dụ: LIC-2026-COSDOLOVE-001"
              value={licenseDocument}
              onChange={(e) => setLicenseDocument(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Ghi chú kiểm duyệt:</label>
            <textarea
              placeholder="Ghi chú thêm về tác giả, phạm vi sử dụng, điều khoản..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white resize-none"
            />
          </div>

          <div>
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={authorConsent}
                onChange={(e) => setAuthorConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
              />
              <span className="text-slate-300 text-[11px] leading-tight">
                Xác nhận tác giả/chủ sở hữu video đã chính thức đồng ý cho phép phân phối lại nội dung này.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Quyền Sử Dụng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
