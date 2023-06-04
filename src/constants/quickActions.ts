import { createWorkflow } from "./runQuickAction";

export const quickActions = ["createWorkflow"];

export const quickActionsInfo = {
  createWorkflow: {
    action: createWorkflow,
    fields: [
      {
        name: "Account SID",
        field: "accountSid",
      },
      {
        name: "Auth Token",
        field: "authToken",
      },
      {
        name: "Studio Flow Name",
        field: "studioFlowName",
      },
      {
        name: "Workflow Name",
        field: "workflowName",
      },
    ],
  },
};
