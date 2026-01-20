import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { StorageUtil } from '../utils/storage';
import { useAppStore } from '../store/appStore';

interface ProjectGalleryProps {
  onLoadProject: (project: Project) => void;
}

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ onLoadProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { addNotification } = useAppStore();

  const refreshProjects = async () => {
    try {
      const list = await StorageUtil.getAllProjects();
      setProjects(list);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete project "${name}"?`)) {
      try {
        await StorageUtil.deleteProject(name);
        await refreshProjects();
        addNotification(`Project "${name}" deleted`, 'success');
      } catch (error) {
        console.error(error);
        addNotification('Failed to delete project', 'error');
      }
    }
  };

  if (projects.length === 0) {
    return <div className="empty-state">No saved projects yet.</div>;
  }

  return (
    <div className="project-gallery">
      {projects.map((project) => (
        <div 
          key={project.name} 
          className="project-card"
          onClick={() => onLoadProject(project)}
        >
          <div className="project-thumbnail">
            {project.thumbnail ? (
              <img src={project.thumbnail} alt={project.name} />
            ) : (
              <div className="thumbnail-placeholder">No Preview</div>
            )}
          </div>
          <div className="project-info">
            <span className="project-title">{project.name}</span>
            <span className="project-date">
              {new Date(project.modifiedAt).toLocaleDateString()}
            </span>
          </div>
          <button 
            className="delete-project-btn"
            onClick={(e) => handleDelete(e, project.name)}
            title="Delete Project"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ProjectGallery;
