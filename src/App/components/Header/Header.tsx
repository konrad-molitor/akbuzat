import {CSSProperties} from "react";
import classNames from "classnames";
import {LoadFileIconSVG} from "../../../icons/LoadFileIconSVG.tsx";
import {DeleteIconSVG} from "../../../icons/DeleteIconSVG.tsx";
import {UpdateBadge} from "./components/UpdateBadge.js";

export function Header({appVersion, canShowCurrentVersion, modelName, onLoadClick, loadPercentage, onResetChatClick}: HeaderProps) {
    return (
        <div className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900">
                <div
                    className={classNames(
                        "absolute inset-0 rounded-lg bg-blue-500/20 dark:bg-blue-500/10 transition-all duration-300",
                        loadPercentage === 1 && "opacity-0"
                    )}
                    style={{
                        width: loadPercentage != null ? `${loadPercentage * 100}%` : undefined
                    } as CSSProperties}
                />

                {modelName != null ? (
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{modelName}</div>
                ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No model loaded</div>
                )}

                <button
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative z-10"
                    disabled={onResetChatClick == null}
                    onClick={onResetChatClick}
                >
                    <DeleteIconSVG className="w-5 h-5" />
                </button>
                <button 
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors relative z-10"
                    onClick={onLoadClick}
                >
                    <LoadFileIconSVG className="w-5 h-5" />
                </button>
            </div>
            <UpdateBadge
                appVersion={appVersion}
                canShowCurrentVersion={canShowCurrentVersion}
            />
        </div>
    );
}

type HeaderProps = {
    appVersion?: string,
    canShowCurrentVersion?: boolean,
    modelName?: string,
    onLoadClick?(): void,
    loadPercentage?: number,
    onResetChatClick?(): void
};
