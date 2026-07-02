export type WorkflowPrimaryAction = {
  readonly label: string;
  readonly detail?: string;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly onClick?: () => void;
};

export type WorkflowPrimaryActionSetter = (action: WorkflowPrimaryAction | undefined) => void;
