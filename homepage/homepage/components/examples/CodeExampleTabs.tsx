"use client";

import { clsx } from "clsx";
import { useState } from "react";

interface CodeExampleTab {
  name: string;
  content: React.ReactNode;
}

export interface CodeExampleTabsProps {
  tabs: Array<CodeExampleTab>;
  className?: string;
}

// TODO: handle tabs in CodeGroup component

export function CodeExampleTabs({
  tabs,
  className = "",
}: CodeExampleTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      className={clsx(
        "bg-white h-full flex flex-col",
        "dark:bg-stone-925",
        className,
      )}
    >
      <div className="flex border-b overflow-x-auto overflow-y-hidden dark:bg-stone-950">
        {tabs.map((tab, index) => (
          <div key={index}>
            <button
              key={index}
              className={clsx(
                activeTab === index
                  ? "border-blue-700 bg-white text-stone-700 dark:bg-stone-925 dark:text-blue-500 dark:border-blue-500"
                  : "border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-blue-500",
                "flex items-center -mb-px transition-colors px-3 pb-2 pt-2.5 block text-xs border-b-2 ",
              )}
              onClick={() => setActiveTab(index)}
            >
              {tab.name}
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">{tabs[activeTab].content}</div>
    </div>
  );
}
