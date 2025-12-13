"use client";

import { useState } from "react";
import { ChevronDown, Cpu, Zap, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { AVAILABLE_MODELS, type Model } from "@/lib/models";

interface ModelSelectorProps {
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModelId, onSelect, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);

  const groupedModels = AVAILABLE_MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>
  );

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
          "bg-gray-800 hover:bg-gray-700 border border-gray-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Cpu className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-200 max-w-[150px] truncate">
          {selectedModel?.name || "Select model"}
        </span>
        <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20">
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-800/50">
                  {provider}
                </div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelect(model.id);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-800 transition-colors text-left",
                      selectedModelId === model.id && "bg-purple-900/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100">
                          {model.name}
                        </span>
                        {model.isReasoning && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded">
                            <Sparkles className="w-3 h-3" />
                            Reasoning
                          </span>
                        )}
                        {model.isFree && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-900/50 text-green-300 rounded">
                            <Zap className="w-3 h-3" />
                            Free
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {model.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
