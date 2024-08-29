import { FC, ReactNode, useState } from "react";
import cx from "classnames";

interface Tab {
  id: number;
  title: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

const Tabs: FC<TabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);
  };

  return (
    <div className="shadow-xl">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={cx(
              "flex-1 text-center text-3xl transition-colors duration-300 p-3",
              {
                "bg-yellow-400 text-stone-900": activeTab === tab.id,
                "bg-stone-800 bg-opacity-50 text-white hover:bg-opacity-30":
                  activeTab !== tab.id,
              },
            )}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div>{tabs[activeTab].content}</div>
    </div>
  );
};

export default Tabs;
