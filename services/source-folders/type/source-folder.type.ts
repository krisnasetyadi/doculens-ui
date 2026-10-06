export interface Folder {
  folder_id: string;
  name: string;
  owner_id: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id: string | null;
}

/** Leave `parent_folder_id` out to keep the folder where it is. */
export interface UpdateFolderRequest {
  name: string;
  parent_folder_id?: string | null;
}

export interface DeleteFolderResponse {
  deleted: boolean;
}
