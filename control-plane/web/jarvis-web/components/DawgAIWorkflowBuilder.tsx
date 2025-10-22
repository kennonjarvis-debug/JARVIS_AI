"use client";

import { useState } from "react";

interface WorkflowStep {
  id: string;
  type: string;
  action: string;
  parameters: Record<string, any>;
  condition?: any;
  nextStepId?: string;
}

interface WorkflowBuilderProps {
  initialSteps?: WorkflowStep[];
  onSave: (steps: WorkflowStep[]) => void;
  onCancel: () => void;
}

const STEP_TYPES = [
  { value: "audio", label: "Audio Processing", icon: "🎵" },
  { value: "export", label: "Export", icon: "📤" },
  { value: "notification", label: "Notification", icon: "🔔" },
  { value: "conditional", label: "Conditional", icon: "🔀" },
];

const ACTIONS = {
  audio: [
    { value: "normalize_levels", label: "Normalize Levels" },
    { value: "apply_eq", label: "Apply EQ" },
    { value: "apply_compression", label: "Apply Compression" },
    { value: "apply_reverb", label: "Apply Reverb" },
  ],
  export: [
    { value: "export_stems", label: "Export Stems" },
    { value: "export_mix", label: "Export Mix" },
    { value: "export_master", label: "Export Master" },
  ],
  notification: [
    { value: "send_notification", label: "Send Notification" },
    { value: "send_email", label: "Send Email" },
  ],
  conditional: [
    { value: "check_condition", label: "Check Condition" },
  ],
};

export default function DawgAIWorkflowBuilder({
  initialSteps = [],
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialSteps.length > 0
      ? initialSteps
      : [
          {
            id: "1",
            type: "audio",
            action: "normalize_levels",
            parameters: {},
          },
        ]
  );
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: String(steps.length + 1),
      type: "audio",
      action: "normalize_levels",
      parameters: {},
    };
    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return; // Keep at least one step
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    if (selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length - 1);
    }
  };

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
    setSelectedStepIndex(newIndex);
  };

  const selectedStep = steps[selectedStepIndex];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Workflow Builder</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps List */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Steps</h3>
            <button
              onClick={addStep}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              + Add Step
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => setSelectedStepIndex(index)}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedStepIndex === index
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">#{index + 1}</span>
                    <span>
                      {STEP_TYPES.find((t) => t.value === step.type)?.icon}
                    </span>
                    <span className="text-sm font-medium">
                      {ACTIONS[step.type as keyof typeof ACTIONS]?.find(
                        (a) => a.value === step.action
                      )?.label || step.action}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(index);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Configuration */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Configure Step #{selectedStepIndex + 1}</h3>

          <div className="space-y-4">
            {/* Step Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Step Type</label>
              <select
                value={selectedStep.type}
                onChange={(e) => {
                  updateStep(selectedStepIndex, {
                    type: e.target.value,
                    action: ACTIONS[e.target.value as keyof typeof ACTIONS][0].value,
                    parameters: {},
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {STEP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                value={selectedStep.action}
                onChange={(e) =>
                  updateStep(selectedStepIndex, { action: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {ACTIONS[selectedStep.type as keyof typeof ACTIONS]?.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameters (simplified) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Parameters (JSON)
              </label>
              <textarea
                value={JSON.stringify(selectedStep.parameters, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    updateStep(selectedStepIndex, { parameters: params });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                rows={5}
              />
            </div>

            {/* Step Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => moveStep(selectedStepIndex, "up")}
                disabled={selectedStepIndex === 0}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                ↑ Move Up
              </button>
              <button
                onClick={() => moveStep(selectedStepIndex, "down")}
                disabled={selectedStepIndex === steps.length - 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                ↓ Move Down
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(steps)}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Save Workflow
        </button>
      </div>
    </div>
  );
}
