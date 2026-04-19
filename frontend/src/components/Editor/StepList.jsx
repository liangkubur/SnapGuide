// frontend/src/components/Editor/StepList.jsx
// Drag-and-drop sortable step list using @hello-pangea/dnd
'use client';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { API_URL } from '@/lib/api';

export default function StepList({ steps, onReorder, onEditStep, onDeleteStep }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(steps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {steps.map((step, index) => (
              <Draggable key={String(step.id)} draggableId={String(step.id)} index={index}>
                {(drag, snapshot) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    className={`card p-4 flex gap-4 transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary-400' : ''}`}
                  >
                    {/* Drag handle */}
                    <div
                      {...drag.dragHandleProps}
                      className="flex items-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing pt-1 flex-shrink-0"
                      title="Drag to reorder"
                    >
                      <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
                        <circle cx="3" cy="4" r="2" /><circle cx="11" cy="4" r="2" />
                        <circle cx="3" cy="10" r="2" /><circle cx="11" cy="10" r="2" />
                        <circle cx="3" cy="16" r="2" /><circle cx="11" cy="16" r="2" />
                      </svg>
                    </div>

                    {/* Step number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    {/* Screenshot thumbnail */}
                    {step.screenshot_url && (
                      <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={`${API_URL}${step.screenshot_url}`}
                          alt={`Step ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {step.instruction || <span className="text-gray-400 italic">No instruction</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {step.action_type && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {step.action_type}
                          </span>
                        )}
                        {step.page_url && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">{step.page_url}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => onEditStep(step, index)}
                        className="text-xs btn-secondary py-1 px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteStep(step.id)}
                        className="text-xs btn-danger py-1 px-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
