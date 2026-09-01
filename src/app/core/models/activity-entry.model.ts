export type ActivitySubjectType = 'customer' | 'lot' | 'contract' | 'project';

export interface ActivityChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ActivityEntry {
  id: number;
  date: string;
  description: string;
  causer_name: string;
  changes?: ActivityChanges;
  properties?: Record<string, unknown>;
}
