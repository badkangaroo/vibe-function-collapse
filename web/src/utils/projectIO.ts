import JSZip from 'jszip';
import { Project, Tile } from '../types';
import { saveAs } from 'file-saver';

interface ProjectManifest {
  version: string;
  exporterVersion: string;
  projectName: string;
  createdAt: string;
  metadata: {
    tileCount: number;
    socketCount: number;
  };
}

export class ProjectIO {
  /**
   * Export a project as a ZIP archive containing JSON and images
   */
  static async exportProject(project: Project): Promise<void> {
    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    
    // Create a deep copy of the project to modify for export
    const projectToSave = JSON.parse(JSON.stringify(project)) as Project;
    const tiles = projectToSave.tiles;

    // Process tiles and extract images
    for (const tile of tiles) {
      if (tile.sprite && tile.sprite.startsWith('data:image')) {
        // Extract base64 data
        const matches = tile.sprite.match(/^data:image\/([a-z]+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1]; // png, jpeg, etc.
          const data = matches[2];
          const filename = `${tile.id}.${extension}`;
          
          if (imagesFolder) {
            imagesFolder.file(filename, data, { base64: true });
            // Update the sprite path in the project JSON to point to the file
            tile.sprite = `images/${filename}`;
          }
        }
      }
    }

    // Handle Project Thumbnail
    if (projectToSave.thumbnail && projectToSave.thumbnail.startsWith('data:image')) {
        const matches = projectToSave.thumbnail.match(/^data:image\/([a-z]+);base64,(.+)$/);
        if (matches) {
            const extension = matches[1];
            const data = matches[2];
            const filename = `thumbnail.${extension}`;
            zip.file(filename, data, { base64: true });
            projectToSave.thumbnail = filename;
        }
    }

    // Create Manifest
    const manifest: ProjectManifest = {
      version: project.version,
      exporterVersion: '1.0.0',
      projectName: project.name,
      createdAt: new Date().toISOString(),
      metadata: {
        tileCount: project.tiles.length,
        socketCount: project.sockets.length
      }
    };

    // Add JSON files
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('project.json', JSON.stringify(projectToSave, null, 2));

    // Generate and save zip
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wfc.zip`);
  }

  /**
   * Import a project from a ZIP archive
   */
  static async importProject(file: File): Promise<Project> {
    const zip = await JSZip.loadAsync(file);
    
    // Validate Manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid project archive: manifest.json missing');
    }
    const manifestStr = await manifestFile.async('text');
    const manifest = JSON.parse(manifestStr) as ProjectManifest;
    console.log(`Importing project: ${manifest.projectName} (v${manifest.version})`);

    // Load Project Data
    const projectFile = zip.file('project.json');
    if (!projectFile) {
      throw new Error('Invalid project archive: project.json missing');
    }
    const projectStr = await projectFile.async('text');
    const project = JSON.parse(projectStr) as Project;

    // Reconstruct Images
    for (const tile of project.tiles) {
      if (tile.sprite && !tile.sprite.startsWith('data:image')) {
        // It's a path, try to load it from zip
        const imageFile = zip.file(tile.sprite);
        if (imageFile) {
          const base64 = await imageFile.async('base64');
          const ext = tile.sprite.split('.').pop();
          tile.sprite = `data:image/${ext};base64,${base64}`;
        }
      }
    }

    // Reconstruct Thumbnail
    if (project.thumbnail && !project.thumbnail.startsWith('data:image')) {
        const imageFile = zip.file(project.thumbnail);
        if (imageFile) {
            const base64 = await imageFile.async('base64');
            const ext = project.thumbnail.split('.').pop();
            project.thumbnail = `data:image/${ext};base64,${base64}`;
        }
    }

    return project;
  }
}
