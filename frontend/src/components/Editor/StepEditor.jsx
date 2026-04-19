// frontend/src/components/Editor/StepEditor.jsx
// Modal for editing a single step's instruction and screenshot
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { API_URL } from '@/lib/api';

export default function StepEditor({ step, index, onSave, onCancel }) {
  const [instruction, setInstruction] = useState(step.instruction || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('instruction', instruction);
      if (imageFile) formData.append('screenshot', imageFile);
      await onSave(step.id, formData);
    } finally {
      setSaving(false);
    }
  };

  const screenshotSrc = imagePreview || (step.screenshot_url ? `${API_URL}${step.screenshot_url}` : null);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Edit Step {index + 1}</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Screenshot preview */}
          <div>
            <label className="label">Screenshot</label>
            {screenshotSrc ? (
              <div className="relative mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={screenshotSrc}
                  alt={`Step ${index + 1}`}
                  className="w-full object-contain max-h-72"
                />
              </div>
            ) : (
              <div className="mb-3 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center h-32 bg-gray-50 text-gray-400 text-sm">
                No screenshot
              </div>
            )}
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <span>📎 Replace Screenshot</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>

          {/* Instruction */}
          <div>
            <label className="label" htmlFor="instruction">Instruction</label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Describe this step…"
            />
          </div>

          {/* Metadata (readonly) */}
          {(step.action_type || step.page_url) && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              {step.action_type && <div><span className="font-medium">Action:</span> {step.action_type}</div>}
              {step.element_selector && <div><span className="font-medium">Selector:</span> <code>{step.element_selector}</code></div>}
              {step.page_url && <div><span className="font-medium">URL:</span> {step.page_url}</div>}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
