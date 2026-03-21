export type Task = {
  name: string;
  completed: boolean;
  duration?: number;
};

export type Day = {
  date: string;
  weight?: number;
  tasks: Task[];
};
