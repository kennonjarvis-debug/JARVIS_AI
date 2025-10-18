"use client";

import { useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  metadata: {
    genre?: string;
    bpm?: number;
    key?: string;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface DawgAIProjectCardProps {
  project: Project;
  onUpdate?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export default function DawgAIProjectCard({
  project,
  onUpdate,
  onDelete,
  onArchive,
}: DawgAIProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/dawg-ai/projects/${project.id}/export`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name}-export.json`;
        a.click();
      }
    } catch (error) {
      console.error("Failed to export project:", error);
    }
  };

  const handleDuplicate = async () => {
    const newName = prompt("Enter name for duplicated project:", `${project.name} (Copy)`);
    if (!newName) return;

    try {
      const res = await fetch(`/api/dawg-ai/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to duplicate project:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">{project.name}</h3>
            <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    handleDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    handleExport();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  Export
                </button>
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    Archive
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this project?")) {
                        onDelete();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
        )}

        {/* Metadata Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.metadata.genre && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              {project.metadata.genre}
            </span>
          )}
          {project.metadata.bpm && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
              {project.metadata.bpm} BPM
            </span>
          )}
          {project.metadata.key && (
            <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded">
              {project.metadata.key}
            </span>
          )}
          {project.metadata.tags?.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {project.metadata.tags && project.metadata.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{project.metadata.tags.length - 2} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
