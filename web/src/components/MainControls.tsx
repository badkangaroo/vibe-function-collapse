import React, { useState } from 'react';
import TileManager from './TileManager';
import RuleEditor from './RuleEditor';
import GenerationPanel from './GenerationPanel';
import ExportPanel from './ExportPanel';

type TabType = 'tiles' | 'rules' | 'generate' | 'export';

const MainControls: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('tiles');

    const tabs: { id: TabType; label: string }[] = [
        { id: 'tiles', label: 'Tiles' },
        { id: 'rules', label: 'Rules' },
        { id: 'generate', label: 'Generate' },
        { id: 'export', label: 'Export' },
    ];

    return (
        <div className="main-controls">
            <div className="tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="tab-content main-tab-content">
                {activeTab === 'tiles' && (
                    <section className="control-section">
                        <TileManager />
                    </section>
                )}
                {activeTab === 'rules' && (
                    <section className="control-section">
                        <RuleEditor />
                    </section>
                )}
                {activeTab === 'generate' && (
                    <section className="control-section">
                        <GenerationPanel />
                    </section>
                )}
                {activeTab === 'export' && (
                    <section className="control-section">
                        <ExportPanel />
                    </section>
                )}
            </div>
        </div>
    );
};

export default MainControls;
