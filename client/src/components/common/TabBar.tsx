import React from 'react';

export interface TabItem<T extends string = string> {
    id: T;
    label: string;
    icon?: React.ReactNode;
}

export interface TabBarProps<T extends string = string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    /** Primary style for main navigation (larger, border-bottom) */
    variant?: 'primary' | 'secondary' | 'segmented';
    className?: string;
}

/**
 * Reusable tab bar component with primary and secondary variants.
 * Primary: Larger tabs with bottom border indicator (for main navigation)
 * Secondary: Smaller tabs with active background (for sub-navigation)
 */
export function TabBar<T extends string = string>({
    tabs,
    activeTab,
    onTabChange,
    variant = 'primary',
    className = '',
}: TabBarProps<T>) {
    const isPrimary = variant === 'primary';
    const isSegmented = variant === 'segmented';

    if (isSegmented) {
        return (
            <div className={`flex gap-1 rounded-xl bg-gray-200/80 p-1 dark:bg-gray-900/60 ${className}`}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5 dark:bg-gray-700 dark:text-white dark:ring-white/10'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                            title={tab.label}
                            aria-label={`${tab.label} Tab`}
                        >
                            {tab.icon}
                            <span className="truncate">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={`flex border-b border-gray-200 dark:border-gray-600 pt-1 ${isPrimary ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'} ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                const baseClasses = 'flex items-center gap-2 font-medium transition-colors mx-1';
                const sizeClasses = isPrimary
                    ? 'px-6 py-3'
                    : 'px-4 py-2 text-sm';

                const activeClasses = isPrimary
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-x border-t border-gray-200 dark:border-gray-600 rounded-t-lg -mb-px';

                const inactiveClasses = isPrimary
                    ? 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`${baseClasses} ${sizeClasses} ${isActive ? activeClasses : inactiveClasses} ${isPrimary ? 'truncate max-w-[250px]' : ''}`}
                        title={isPrimary ? tab.label : undefined}
                        aria-label={`${tab.label} Tab`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
