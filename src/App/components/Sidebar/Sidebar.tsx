import { ReactElement } from "react";
import classNames from "classnames";
import { SystemPromptWidget } from "./components/SystemPromptWidget/SystemPromptWidget";

export interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps): ReactElement {
    return (
        <aside className={classNames(
            "fixed top-24 right-0 bottom-24 w-80",
            "bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700",
            "flex flex-col overflow-hidden z-30",
            className
        )}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <SystemPromptWidget />
            </div>
        </aside>
    );
} 