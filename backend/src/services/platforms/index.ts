export type PlatformSnapshotResult = {
  rating?: number | null;
  rankTitle?: string | null;
  problemsSolved?: number | null;
  raw: any;
};

export interface PlatformAdapter {
  name: string;
  fetchSnapshot(username: string): Promise<PlatformSnapshotResult>;
}
