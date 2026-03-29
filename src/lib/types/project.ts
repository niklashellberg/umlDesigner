export interface ProjectItem {
  diagramId: string
  order: number
}

export interface ProjectMeta {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  meta: ProjectMeta
  items: ProjectItem[]
}
