import React from 'react';
import { CategoryTab } from '../types';
import {
  Globe,
  Image as ImageIcon,
  Video as VideoIcon,
  FolderArchive,
  Newspaper,
  BookOpen,
  Users,
  FileText,
} from 'lucide-react';

interface CategoryTabsProps {
  activeCategory: CategoryTab;
  setActiveCategory: (cat: CategoryTab) => void;
  totalImagesCount?: number;
  totalVideosCount?: number;
  totalFilesCount?: number;
  loading?: boolean;
}

const TABS: { id: CategoryTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: VideoIcon },
  { id: 'filehosts', label: 'Files & Documents', icon: FolderArchive },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'papers', label: 'Papers', icon: BookOpen },
  { id: 'people', label: 'People', icon: Users },
  { id: 'pdfs', label: 'PDFs', icon: FileText },
];

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  setActiveCategory,
  totalImagesCount = 0,
  totalVideosCount = 0,
  totalFilesCount = 0,
}) => {
  return (
    <div className="w-full border-b border-gray-100 bg-white/80 sticky top-20 z-20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;

            let badgeCount: number | null = null;
            if (tab.id === 'images' && totalImagesCount > 0) badgeCount = totalImagesCount;
            if (tab.id === 'videos' && totalVideosCount > 0) badgeCount = totalVideosCount;
            if (tab.id === 'filehosts' && totalFilesCount > 0) badgeCount = totalFilesCount;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {badgeCount !== null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
